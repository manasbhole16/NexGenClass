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

async function runPlannerTests() {
    console.log("==================================================");
    console.log("  PHASE 5: UNIFIED ACADEMIC PLANNER TEST SUITE    ");
    console.log("==================================================");

    try {
        const ts = Date.now();
        const teacherEmail = `plan_teacher_${ts}@test.com`;
        const student1Email = `plan_s1_${ts}@test.com`;
        const student2Email = `plan_s2_${ts}@test.com`;
        const password = 'Password123!';

        // 1. Register Users
        console.log("\n[1] Registering Test Users...");
        const tSign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Prof. Planner', email: teacherEmail, password, role: 'teacher' }
        });
        const s1Sign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Planner Student 1', email: student1Email, password, role: 'student' }
        });
        const s2Sign = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Planner Student 2', email: student2Email, password, role: 'student' }
        });

        const teacherCookie = tSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const s1Id = s1Sign.data.user._id;
        const s2Id = s2Sign.data.user._id;
        console.log("✓ Users registered successfully");

        // 2. Create Classroom & Enroll Student 1 Only
        console.log("\n[2] Teacher creates Classroom & Enrolls Student 1...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-501 Distributed Systems ${ts}`, section: 'B', subject: 'Computer Science' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });
        console.log(`✓ Classroom ${roomId} created; Student 1 enrolled (Student 2 NOT enrolled)`);

        // 3. TEST 1: Create Personal Task from Planner API
        console.log("\n[TEST 1] Student 1 creates personal task from planner...");
        const todayDate = new Date().toISOString().split('T')[0];
        const taskRes = await makeRequest({
            path: '/api/calendar/tasks',
            method: 'POST',
            body: {
                title: 'Review Chapter 5 on Raft Consensus',
                description: 'Study leader election and log replication',
                dueDate: todayDate,
                priority: 'High'
            },
            cookie: s1Cookie
        });
        if (taskRes.status !== 201) throw new Error(`Test 1 Failed: Expected 201, got ${taskRes.status}`);
        const personalTaskId = taskRes.data.task._id;
        console.log(`✓ TEST 1 PASSED: Personal task created (ID: ${personalTaskId})`);

        // 4. TEST 2: Toggle Task Status
        console.log("\n[TEST 2] Student 1 marks task complete...");
        const toggleRes = await makeRequest({
            path: `/api/calendar/tasks/${personalTaskId}/toggle`,
            method: 'PATCH',
            cookie: s1Cookie
        });
        if (toggleRes.status !== 200 || toggleRes.data.task.status !== 'Done') {
            throw new Error(`Test 2 Failed: Expected status Done, got ${toggleRes.data.task?.status}`);
        }
        console.log("✓ TEST 2 PASSED: Task status successfully toggled to 'Done'");

        // 5. TEST 3: Teacher creates an Assignment with Due Date
        console.log("\n[TEST 3] Teacher creates classroom assignment with Due Date...");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const assignRes = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: {
                title: 'Assignment 1: Distributed Key-Value Store',
                description: 'Implement Paxos or Raft',
                roomId,
                dueDate: tomorrow.toISOString(),
                maxMarks: 100,
                taskType: 'assignment',
                topic: 'Consensus'
            },
            cookie: teacherCookie
        });
        if (assignRes.status !== 201) throw new Error(`Test 3 Failed: Expected 201, got ${assignRes.status}`);
        console.log("✓ TEST 3 PASSED: Classroom assignment created with tomorrow's deadline");

        // 6. TEST 4: Teacher creates an Attendance Session (Phase 4 integration)
        console.log("\n[TEST 4] Teacher creates attendance session (Phase 4 integration)...");
        const attRes = await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: todayDate,
                title: 'Lecture: Distributed Transactions',
                sessionType: 'lecture',
                startTime: '10:00',
                endTime: '11:30',
                records: [{ student: s1Id, status: 'Present' }]
            },
            cookie: teacherCookie
        });
        if (attRes.status !== 200) throw new Error(`Test 4 Failed: Expected 200, got ${attRes.status}`);
        console.log("✓ TEST 4 PASSED: Attendance session recorded for today");

        // 7. TEST 5: Student 1 retrieves Unified Calendar Events
        console.log("\n[TEST 5] Student 1 queries Unified Planner Events...");
        const calEventsRes = await makeRequest({
            path: '/api/calendar/events',
            method: 'GET',
            cookie: s1Cookie
        });
        if (calEventsRes.status !== 200) throw new Error(`Test 5 Failed: Expected 200, got ${calEventsRes.status}`);
        const s1Events = calEventsRes.data.events;
        
        const hasPersonalTask = s1Events.some(e => e.eventType === 'task' && e.title.includes('Raft Consensus'));
        const hasAssignment = s1Events.some(e => e.eventType === 'assignment' && e.title.includes('Key-Value Store'));
        const hasAttendance = s1Events.some(e => e.eventType === 'attendance' && e.title.includes('Distributed Transactions'));

        if (!hasPersonalTask || !hasAssignment || !hasAttendance) {
            throw new Error(`Test 5 Failed: Missing aggregated event types! Found: ${JSON.stringify(s1Events.map(e => e.eventType))}`);
        }
        console.log(`✓ TEST 5 PASSED: Aggregated all 3 distinct academic sources (Task, Assignment, Attendance)`);

        // 8. TEST 6: Student Privacy Isolation
        console.log("\n[TEST 6] Student Privacy: Student 2 (unenrolled) queries calendar...");
        const s2CalRes = await makeRequest({
            path: '/api/calendar/events',
            method: 'GET',
            cookie: s2Cookie
        });
        const s2Events = s2CalRes.data.events || [];
        const leaksStudent1Task = s2Events.some(e => e.title.includes('Raft Consensus'));
        const leaksClassroomAssignment = s2Events.some(e => e.title.includes('Key-Value Store'));

        if (leaksStudent1Task || leaksClassroomAssignment) {
            throw new Error("Test 6 Failed: Student 2 received Student 1's private task or unenrolled classroom assignment!");
        }
        console.log("✓ TEST 6 PASSED: Strict privacy isolation verified (No personal or unenrolled classroom leaks)");

        // 9. TEST 7: Event Type Filtering
        console.log("\n[TEST 7] Query Planner filtered by eventType=assignment...");
        const filterRes = await makeRequest({
            path: '/api/calendar/events?eventType=assignment',
            method: 'GET',
            cookie: s1Cookie
        });
        const onlyAssignments = filterRes.data.events.every(e => e.eventType === 'assignment');
        if (!onlyAssignments || filterRes.data.events.length === 0) {
            throw new Error("Test 7 Failed: Event type filtering failed");
        }
        console.log(`✓ TEST 7 PASSED: Event type filtering strictly returns only assignments (${filterRes.data.events.length} found)`);

        // 10. TEST 8: Upcoming Agenda Feed
        console.log("\n[TEST 8] Student 1 queries Upcoming Academic Agenda Feed...");
        const agendaRes = await makeRequest({
            path: '/api/calendar/upcoming',
            method: 'GET',
            cookie: s1Cookie
        });
        if (agendaRes.status !== 200) throw new Error(`Test 8 Failed: Expected 200, got ${agendaRes.status}`);
        const agenda = agendaRes.data.agenda;
        if (!agenda.today || !agenda.tomorrow) {
            throw new Error("Test 8 Failed: Agenda missing today/tomorrow groupings");
        }
        console.log(`✓ TEST 8 PASSED: Agenda feed successfully organized (${agenda.today.length} today, ${agenda.tomorrow.length} tomorrow, ${agenda.thisWeek.length} this week)`);

        console.log("\n==================================================");
        console.log("  ALL 8 PLANNER 2.0 INTEGRATION TESTS PASSED!     ");
        console.log("==================================================");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runPlannerTests();
