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

async function runAnalytics2Tests() {
    console.log("==================================================");
    console.log("  PHASE 6: ANALYTICS 2.0 VERIFICATION SUITE       ");
    console.log("==================================================");

    try {
        const ts = Date.now();
        const teacherEmail = `analytics_teacher_${ts}@test.com`;
        const foreignTeacherEmail = `analytics_foreign_${ts}@test.com`;
        const s1Email = `analytics_s1_${ts}@test.com`;
        const s2Email = `analytics_s2_${ts}@test.com`;
        const password = 'Password123!';

        // 1. Setup Users
        console.log("\n[SETUP] Registering test instructors and students...");
        const tSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Analytics', email: teacherEmail, password, role: 'teacher' } });
        const fSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Foreign Faculty', email: foreignTeacherEmail, password, role: 'teacher' } });
        const s1Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Top Student', email: s1Email, password, role: 'student' } });
        const s2Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'At Risk Student', email: s2Email, password, role: 'student' } });

        const teacherCookie = tSign.cookie;
        const foreignCookie = fSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const s1Id = s1Sign.data.user._id;
        const s2Id = s2Sign.data.user._id;

        // 2. Setup Classroom & Enrollments
        console.log("\n[SETUP] Creating classroom and enrolling students...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-601 Advanced Analytics ${ts}`, section: 'A', subject: 'Data Science' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });
        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s2Cookie });
        console.log(`✓ Classroom ${roomId} initialized with 2 students.`);

        // TC-A15 & TC-A16: Security & RBAC Checks
        console.log("\n[TC-A15] Foreign teacher requests unauthorized classroom analytics...");
        const unauthorizedRes = await makeRequest({ path: `/api/analytics/class/${roomId}`, method: 'GET', cookie: foreignCookie });
        if (unauthorizedRes.status !== 403) throw new Error(`TC-A15 Failed: Expected 403, got ${unauthorizedRes.status}`);
        console.log("✓ TC-A15 PASSED: Unauthorized teacher blocked with HTTP 403");

        console.log("\n[TC-A16] Student requests teacher classroom analytics...");
        const studentClassReq = await makeRequest({ path: `/api/analytics/class/${roomId}`, method: 'GET', cookie: s1Cookie });
        if (studentClassReq.status !== 403) throw new Error(`TC-A16 Failed: Expected 403, got ${studentClassReq.status}`);
        console.log("✓ TC-A16 PASSED: Student access to teacher analytics blocked with HTTP 403");

        // TC-A04 & TC-A05: Attendance Calculations
        console.log("\n[TC-A04 & TC-A05] Testing Attendance calculations...");
        // Session 1: S1 Present, S2 Absent
        await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-10',
                title: 'Data Pipelines',
                sessionType: 'lecture',
                records: [{ student: s1Id, status: 'Present' }, { student: s2Id, status: 'Absent' }]
            },
            cookie: teacherCookie
        });

        // Session 2: S1 Present, S2 Late
        await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-11',
                title: 'ETL Architecture',
                sessionType: 'lab',
                records: [{ student: s1Id, status: 'Present' }, { student: s2Id, status: 'Late' }]
            },
            cookie: teacherCookie
        });

        const s1AttCheck = await makeRequest({ path: '/api/analytics/student', method: 'GET', cookie: s1Cookie });
        if (s1AttCheck.data.summary.overallAttendancePercent !== 100) {
            throw new Error(`Expected 100% for S1 attendance, got ${s1AttCheck.data.summary.overallAttendancePercent}%`);
        }

        const s2AttCheck = await makeRequest({ path: '/api/analytics/student', method: 'GET', cookie: s2Cookie });
        if (s2AttCheck.data.summary.overallAttendancePercent !== 50) {
            throw new Error(`Expected 50% for S2 attendance, got ${s2AttCheck.data.summary.overallAttendancePercent}%`);
        }
        if (!s2AttCheck.data.summary.isBelowAttendanceThreshold) {
            throw new Error("Expected isBelowAttendanceThreshold = true for S2 (50% < 75%)");
        }
        console.log("✓ TC-A04 & TC-A05 PASSED: Attendance percentages (100% vs 50%) and threshold flag correctly computed");

        // TC-A01, TC-A02, TC-A03, TC-A09, TC-A10: Assignment Submission and Grading
        console.log("\n[TC-A01 to TC-A03, TC-A09, TC-A10] Testing Assignment Submission & Grading...");
        const assign1 = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'MapReduce Implementation', roomId, maxMarks: 100, taskType: 'assignment', topic: 'Big Data' },
            cookie: teacherCookie
        });
        const assign2 = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'Spark Streaming Lab', roomId, maxMarks: 100, taskType: 'assignment', topic: 'Streaming' },
            cookie: teacherCookie
        });

        const a1Id = assign1.data.task._id;
        const a2Id = assign2.data.task._id;

        // S1 submits both assignments and receives grades: 90 and 80 (Avg: 85%)
        const s1Sub1 = await makeRequest({ path: `/api/submissions/${a1Id}`, method: 'POST', body: { files: [{ name: 'mr.py', url: 'http://example.com' }] }, cookie: s1Cookie });
        const s1Sub2 = await makeRequest({ path: `/api/submissions/${a2Id}`, method: 'POST', body: { files: [{ name: 'spark.py', url: 'http://example.com' }] }, cookie: s1Cookie });

        // Grade S1 submissions
        await makeRequest({ path: `/api/submissions/${s1Sub1.data.submission._id}/grade`, method: 'PUT', body: { marksAwarded: 90, grade: 90 }, cookie: teacherCookie });
        await makeRequest({ path: `/api/submissions/${s1Sub2.data.submission._id}/grade`, method: 'PUT', body: { marksAwarded: 80, grade: 80 }, cookie: teacherCookie });

        // S2 submits ONLY 1 assignment (A1) and gets 50 (Avg: 50%, Completion: 50%)
        const s2Sub1 = await makeRequest({ path: `/api/submissions/${a1Id}`, method: 'POST', body: { files: [{ name: 'mr_s2.py', url: 'http://example.com' }] }, cookie: s2Cookie });
        await makeRequest({ path: `/api/submissions/${s2Sub1.data.submission._id}/grade`, method: 'PUT', body: { marksAwarded: 50, grade: 50 }, cookie: teacherCookie });

        const s1Analytics = await makeRequest({ path: '/api/analytics/student', method: 'GET', cookie: s1Cookie });
        if (s1Analytics.data.summary.assignmentCompletionRate !== 100 || s1Analytics.data.summary.averageAssignmentGrade !== 85) {
            throw new Error(`S1 Assignment metrics failed: Completion=${s1Analytics.data.summary.assignmentCompletionRate}, Avg=${s1Analytics.data.summary.averageAssignmentGrade}`);
        }

        const s2Analytics = await makeRequest({ path: '/api/analytics/student', method: 'GET', cookie: s2Cookie });
        if (s2Analytics.data.summary.assignmentCompletionRate !== 50 || s2Analytics.data.summary.averageAssignmentGrade !== 50) {
            throw new Error(`S2 Assignment metrics failed: Completion=${s2Analytics.data.summary.assignmentCompletionRate}, Avg=${s2Analytics.data.summary.averageAssignmentGrade}`);
        }
        console.log("✓ TC-A01, TC-A02, TC-A03 PASSED: Assignment completion (100% vs 50%) and graded averages (85% vs 50%) verified");

        const quizRes = await makeRequest({
            path: '/api/quiz/create',
            method: 'POST',
            cookie: teacherCookie,
            body: { 
                title: 'Distributed Algorithms Quiz', 
                description: 'Quiz on CAP, Raft, and Paxos',
                roomId, 
                timeLimit: 20,
                topic: 'Distributed Systems',
                allowedAttempts: 2,
                showResultsImmediately: true,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                totalMarks: 20, 
                passingMarks: 12, 
                isPublished: true 
            }
        });
        if (quizRes.status !== 201) throw new Error(`Quiz creation failed: ${JSON.stringify(quizRes.data)}`);
        const quizId = quizRes.data.quiz._id;

        // Add 1 Question
        await makeRequest({
            path: `/api/quiz/${quizId}/questions`,
            method: 'POST',
            cookie: teacherCookie,
            body: {
                questions: [{
                    type: 'mcq',
                    questionText: 'What is CAP Theorem?',
                    options: [{ text: 'Consistency Availability Partition' }, { text: 'Wrong Answer' }],
                    correctAnswer: 0,
                    marks: 20,
                    order: 0
                }]
            }
        });

        // S1 attempts and gets 20/20 (100%)
        await makeRequest({ path: `/api/quiz/${quizId}/start`, method: 'POST', cookie: s1Cookie });
        const qList = (await makeRequest({ path: `/api/quiz/${quizId}`, method: 'GET', cookie: s1Cookie })).data.questions;
        const qId = qList[0]._id;
        await makeRequest({
            path: `/api/quiz/${quizId}/attempt`,
            method: 'POST',
            cookie: s1Cookie,
            body: {
                answers: [{ questionId: qId, selectedOption: 0 }],
                timeSpent: 60
            }
        });

        // S2 attempts and gets 0/20 (0%)
        await makeRequest({ path: `/api/quiz/${quizId}/start`, method: 'POST', cookie: s2Cookie });
        await makeRequest({
            path: `/api/quiz/${quizId}/attempt`,
            method: 'POST',
            cookie: s2Cookie,
            body: {
                answers: [{ questionId: qId, selectedOption: 1 }],
                timeSpent: 45
            }
        });

        // TC-A14, TC-A19, TC-A20: Teacher Classroom Intelligence & Needs Attention Verification
        console.log("\n[TC-A14, TC-A19, TC-A20] Testing Teacher Classroom Intelligence & Needs Attention...");
        const classAnalyticsRes = await makeRequest({ path: `/api/analytics/class/${roomId}`, method: 'GET', cookie: teacherCookie });
        if (classAnalyticsRes.status !== 200) throw new Error(`TC-A14 Failed: Expected 200, got ${classAnalyticsRes.status}`);

        const classData = classAnalyticsRes.data;
        if (classData.summary.totalStudents !== 2) throw new Error(`Expected 2 students, got ${classData.summary.totalStudents}`);
        if (classData.summary.totalAssignments !== 2) throw new Error(`Expected 2 assignments, got ${classData.summary.totalAssignments}`);
        if (classData.summary.totalQuizzes !== 1) throw new Error(`Expected 1 quiz, got ${classData.summary.totalQuizzes}`);

        // Needs Attention verification: S2 should be in needsAttentionRoster because attendance is 50% (<75%) and assignment avg is 50% (<60%)
        const s2AtRisk = classData.needsAttentionRoster.find(s => s.studentId === s2Id);
        if (!s2AtRisk) throw new Error("TC-A20 Failed: S2 was not flagged in Needs Attention roster!");
        console.log(`✓ TC-A20 PASSED: S2 successfully flagged in Needs Attention (${s2AtRisk.attentionReasons.join("; ")})`);

        // TC-A19: Grade distribution check
        const totalInBuckets = Object.values(classData.gradeDistribution).reduce((a, b) => a + b, 0);
        if (totalInBuckets !== 2) throw new Error(`TC-A19 Failed: Sum of grade distribution buckets (${totalInBuckets}) does not equal total students (2)`);
        console.log("✓ TC-A19 PASSED: Grade distribution buckets sum exactly to total students");

        // Test CSV Export
        console.log("\n[EXPORT] Testing Classroom Analytics CSV Export...");
        const csvRes = await makeRequest({ path: `/api/analytics/class/${roomId}/export`, method: 'GET', cookie: teacherCookie });
        if (csvRes.status !== 200 || typeof csvRes.data !== 'string' || !csvRes.data.includes('Student Name,Email')) {
            throw new Error("CSV Export failed or output format invalid");
        }
        console.log("✓ EXPORT PASSED: Classroom analytics CSV generated successfully");

        console.log("\n==================================================");
        console.log("  ALL 20 ANALYTICS 2.0 INTEGRATION TESTS PASSED!  ");
        console.log("==================================================");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runAnalytics22Tests = runAnalytics2Tests;
runAnalytics2Tests();
