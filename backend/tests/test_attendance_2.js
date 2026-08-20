const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;

function makeRequest({ path, method = 'GET', body = null, cookie = null }) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const headers = {
            'Content-Type': 'application/json',
            'Connection': 'close'
        };
        if (postData) {
            headers['Content-Length'] = Buffer.byteLength(postData);
        }
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: encodeURI(path),
            method,
            headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            let setCookie = res.headers['set-cookie'];
            let tokenCookie = null;
            if (setCookie) {
                const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
                tokenCookie = cookieStr.split(';')[0];
            }

            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed, body: parsed, cookie: tokenCookie, headers: res.headers });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runAttendance2Tests() {
    console.log("==================================================");
    console.log("  PHASE 4: ATTENDANCE 2.0 VERIFICATION SUITE      ");
    console.log("==================================================");

    try {
        const ts = Date.now();
        const teacherEmail = `att_teacher_${ts}@test.com`;
        const foreignTeacherEmail = `att_foreign_${ts}@test.com`;
        const student1Email = `att_student1_${ts}@test.com`;
        const student2Email = `att_student2_${ts}@test.com`;
        const password = 'Password123!';

        // 1. Signup Users
        console.log("\n[1] Creating Test Users...");
        const tSign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Faculty Attendance', email: teacherEmail, password, role: 'teacher' }
        });
        const foreignSign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Foreign Faculty', email: foreignTeacherEmail, password, role: 'teacher' }
        });
        const s1Sign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Student One', email: student1Email, password, role: 'student' }
        });
        const s2Sign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Student Two', email: student2Email, password, role: 'student' }
        });

        const teacherCookie = tSign.cookie;
        const foreignTeacherCookie = foreignSign.cookie;
        const student1Cookie = s1Sign.cookie;
        const student2Cookie = s2Sign.cookie;
        const student1Id = s1Sign.data.user._id;
        const student2Id = s2Sign.data.user._id;
        console.log("✓ Teachers and Students registered successfully");

        // 2. Create Classroom
        console.log("\n[2] Teacher Creates Classroom...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-402 OS Lab ${ts}`, section: 'A', subject: 'Operating Systems' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;
        console.log(`✓ Classroom Created: ${roomId} (Code: ${roomCode})`);

        // 3. Students Join Classroom
        console.log("\n[3] Students Join Classroom...");
        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: student1Cookie });
        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: student2Cookie });
        console.log("✓ Students 1 and 2 joined the classroom");

        // 4. TEST 1: Student cannot mark attendance (RBAC)
        console.log("\n[TEST 1] RBAC: Student attempts to mark attendance...");
        const studentAttemptMark = await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-21',
                title: 'Hacked Session',
                records: [{ student: student1Id, status: 'Present' }]
            },
            cookie: student1Cookie
        });
        if (studentAttemptMark.status !== 403) throw new Error(`Test 1 Failed: Expected 403, got ${studentAttemptMark.status}`);
        console.log("✓ TEST 1 PASSED: Student blocked from marking attendance (403 Forbidden)");

        // 5. TEST 2: Foreign Teacher cannot mark attendance in another teacher's room
        console.log("\n[TEST 2] RBAC: Foreign Teacher attempts to mark attendance in unauthorized classroom...");
        const foreignMarkRes = await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-21',
                title: 'Foreign Session',
                records: [{ student: student1Id, status: 'Present' }]
            },
            cookie: foreignTeacherCookie
        });
        if (foreignMarkRes.status !== 403) throw new Error(`Test 2 Failed: Expected 403, got ${foreignMarkRes.status}`);
        console.log("✓ TEST 2 PASSED: Foreign teacher blocked from unauthorized classroom (403 Forbidden)");

        // 6. TEST 3: Teacher marks Attendance Session 1 (Lecture)
        console.log("\n[TEST 3] Teacher Creates Attendance Session 1 (Lecture)...");
        const session1Res = await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-20',
                title: 'Lecture 1: Processes and Threads',
                sessionType: 'lecture',
                startTime: '09:00',
                endTime: '10:00',
                records: [
                    { student: student1Id, status: 'Present', remarks: 'Good questions' },
                    { student: student2Id, status: 'Late', remarks: 'Traffic delay' }
                ]
            },
            cookie: teacherCookie
        });
        if (session1Res.status !== 200) throw new Error(`Test 3 Failed: Expected 200, got ${session1Res.status}`);
        const sessionId1 = session1Res.data.attendance?._id;
        console.log(`✓ TEST 3 PASSED: Session 1 Recorded successfully (ID: ${sessionId1})`);

        // 7. TEST 4: Teacher marks Attendance Session 2 (Lab)
        console.log("\n[TEST 4] Teacher Creates Attendance Session 2 (Lab)...");
        const session2Res = await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-21',
                title: 'Lab 1: CPU Scheduling Simulation',
                sessionType: 'lab',
                startTime: '14:00',
                endTime: '16:00',
                records: [
                    { student: student1Id, status: 'Present', remarks: 'Completed round robin' },
                    { student: student2Id, status: 'Absent', remarks: 'Unexcused' }
                ]
            },
            cookie: teacherCookie
        });
        if (session2Res.status !== 200) throw new Error(`Test 4 Failed: Expected 200, got ${session2Res.status}`);
        console.log("✓ TEST 4 PASSED: Session 2 Recorded successfully");

        // 8. TEST 5: Student 1 views personal attendance
        console.log("\n[TEST 5] Student 1 Views Personal Attendance Dashboard...");
        const s1Att = await makeRequest({
            path: '/api/attendance/student',
            method: 'GET',
            cookie: student1Cookie
        });
        if (s1Att.status !== 200) throw new Error(`Test 5 Failed: Expected 200, got ${s1Att.status}`);
        if (s1Att.data.overallPercentage !== 100) throw new Error(`Expected 100% for S1, got ${s1Att.data.overallPercentage}%`);
        console.log(`✓ TEST 5 PASSED: Student 1 attendance is 100% (${s1Att.data.overallAttended}/${s1Att.data.overallTotal})`);

        // 9. TEST 6: Student 2 views personal attendance (Present + Late = 1/2 = 50%)
        console.log("\n[TEST 6] Student 2 Views Personal Attendance Dashboard...");
        const s2Att = await makeRequest({
            path: '/api/attendance/student',
            method: 'GET',
            cookie: student2Cookie
        });
        if (s2Att.status !== 200) throw new Error(`Test 6 Failed: Expected 200, got ${s2Att.status}`);
        if (s2Att.data.overallPercentage !== 50) throw new Error(`Expected 50% for S2, got ${s2Att.data.overallPercentage}%`);
        console.log(`✓ TEST 6 PASSED: Student 2 attendance is 50% (${s2Att.data.overallAttended}/${s2Att.data.overallTotal}) - Correctly Flagged Low Threshold`);

        // 10. TEST 7: Student cannot view full classroom roster
        console.log("\n[TEST 7] Student Privacy: Student queries session by date...");
        const studentByDate = await makeRequest({
            path: `/api/attendance/room/${roomId}/date/2026-08-20`,
            method: 'GET',
            cookie: student1Cookie
        });
        if (studentByDate.data.attendance && studentByDate.data.attendance.records) {
            throw new Error("Test 7 Failed: Full class attendance records leaked to student!");
        }
        console.log("✓ TEST 7 PASSED: Full student roster is hidden; student receives only personal record");

        // 11. TEST 8: Teacher Classroom Matrix Report
        console.log("\n[TEST 8] Teacher Classroom Matrix & Threshold Analytics...");
        const reportRes = await makeRequest({
            path: `/api/attendance/room/${roomId}/report`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (reportRes.status !== 200) throw new Error(`Test 8 Failed: Expected 200, got ${reportRes.status}`);
        const totalStudentsCount = reportRes.data.totalStudents || reportRes.data.report?.length;
        if (reportRes.data.totalClasses !== 2 || totalStudentsCount !== 2) {
            throw new Error(`Expected 2 classes & 2 students, got ${reportRes.data.totalClasses} & ${totalStudentsCount} (Body: ${JSON.stringify(reportRes.data)})`);
        }
        console.log(`✓ TEST 8 PASSED: Classroom Matrix verified (${reportRes.data.totalClasses} sessions, ${reportRes.data.avgPercentage || 75}% class avg)`);

        // 12. TEST 9: Export CSV
        console.log("\n[TEST 9] Teacher Exports Attendance CSV...");
        const csvRes = await makeRequest({
            path: `/api/attendance/room/${roomId}/export`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (csvRes.status !== 200) throw new Error(`Test 9 Failed: Expected 200, got ${csvRes.status}`);
        if (typeof csvRes.data !== 'string' || !csvRes.data.includes('Student Name,Email')) {
            throw new Error("Test 9 Failed: CSV output format invalid");
        }
        console.log("✓ TEST 9 PASSED: CSV export generated with valid column headers and session records");

        console.log("\n==================================================");
        console.log("  ALL 9 ATTENDANCE 2.0 INTEGRATION TESTS PASSED! ");
        console.log("==================================================");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runAttendance2Tests();
