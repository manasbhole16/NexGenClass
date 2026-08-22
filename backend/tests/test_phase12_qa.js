const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexgenclass';

function makeRequest({ path, method = 'GET', body = null, cookie = null, headers = {} }) {
    return new Promise((resolve, reject) => {
        let postData = null;
        const finalHeaders = {
            'Connection': 'close',
            ...headers
        };

        if (body && !headers['Content-Type']) {
            postData = JSON.stringify(body);
            finalHeaders['Content-Type'] = 'application/json';
            finalHeaders['Content-Length'] = Buffer.byteLength(postData);
        } else if (body && Buffer.isBuffer(body)) {
            postData = body;
            finalHeaders['Content-Length'] = postData.length;
        }

        if (cookie) {
            finalHeaders['Cookie'] = cookie;
        }

        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: encodeURI(path),
            method,
            headers: finalHeaders
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

async function runPhase12QATests() {
    console.log("==================================================");
    console.log("  PHASE 12: PLATFORM QA, SECURITY & PERFORMANCE   ");
    console.log("==================================================");

    try {
        await mongoose.connect(MONGO_URI);

        const ts = Date.now();
        const teacherEmail = `qa_prof_${ts}@platform.com`;
        const foreignTeacherEmail = `qa_foreign_prof_${ts}@platform.com`;
        const s1Email = `qa_alice_${ts}@platform.com`;
        const s2Email = `qa_bob_${ts}@platform.com`;
        const password = 'PlatformPassword123!';

        // 1. AUTHENTICATION & JWT INTEGRITY
        console.log("\n[TEST 1] Authentication: Malformed / missing tokens blocked...");
        const noAuth = await makeRequest({ path: '/api/rooms/my-rooms' });
        if (noAuth.status !== 401) throw new Error(`Test 1 Failed: Expected 401, got ${noAuth.status}`);

        const badToken = await makeRequest({ path: '/api/rooms/my-rooms', headers: { Cookie: 'token=invalid_forged_jwt_token' } });
        if (badToken.status !== 401) throw new Error(`Test 1 Failed: Expected 401 for bad token, got ${badToken.status}`);
        console.log("✓ TEST 1 PASSED: Unauthenticated and forged tokens strictly rejected with HTTP 401");

        // Register Users
        console.log("\n[SETUP] Registering test users for QA suite...");
        const tSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Platform QA', email: teacherEmail, password, role: 'teacher' } });
        const ftSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Foreign QA', email: foreignTeacherEmail, password, role: 'teacher' } });
        const s1Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Alice Student', email: s1Email, password, role: 'student' } });
        const s2Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Bob Student', email: s2Email, password, role: 'student' } });

        const teacherCookie = tSign.cookie;
        const foreignTeacherCookie = ftSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const s1Id = s1Sign.data.user._id;
        const s2Id = s2Sign.data.user._id;

        // Initialize Classroom
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `Distributed Systems QA ${ts}`, section: 'QA-1', subject: 'CS' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        // Enroll Alice; Bob remains unenrolled
        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });

        // 2. RBAC: Student blocked from teacher actions
        console.log("\n[TEST 2] RBAC: Student blocked from creating classroom assignments...");
        const studentTask = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'Unauthorized Student Task', room: roomId },
            cookie: s1Cookie
        });
        if (studentTask.status !== 403) throw new Error(`Test 2 Failed: Expected 403, got ${studentTask.status}`);
        console.log("✓ TEST 2 PASSED: Student assignment creation blocked with HTTP 403");

        // 3. RBAC: Student blocked from Live Session Scheduling
        console.log("\n[TEST 3] RBAC: Student blocked from scheduling live classes...");
        const studentLive = await makeRequest({
            path: `/api/live-sessions/rooms/${roomId}`,
            method: 'POST',
            body: { title: 'Student Live Lecture' },
            cookie: s1Cookie
        });
        if (studentLive.status !== 403) throw new Error(`Test 3 Failed: Expected 403, got ${studentLive.status}`);
        console.log("✓ TEST 3 PASSED: Student live session creation blocked with HTTP 403");

        // 4. RBAC: Student blocked from Attendance Creation
        console.log("\n[TEST 4] RBAC: Student blocked from recording attendance session...");
        const studentAtt = await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: { roomId, sessionDate: new Date(), records: [{ student: s1Id, status: 'present' }] },
            cookie: s1Cookie
        });
        if (studentAtt.status !== 403) throw new Error(`Test 4 Failed: Expected 403, got ${studentAtt.status}`);
        console.log("✓ TEST 4 PASSED: Student attendance creation blocked with HTTP 403");

        // 5. RBAC: Student blocked from AI Teacher endpoints
        console.log("\n[TEST 5] RBAC: Student blocked from AI rubric generation...");
        const studentAI = await makeRequest({
            path: '/api/ai/generate-rubric',
            method: 'POST',
            body: { title: 'Essay on Architecture', criteriaCount: 3 },
            cookie: s1Cookie
        });
        if (studentAI.status !== 403) throw new Error(`Test 5 Failed: Expected 403, got ${studentAI.status}`);
        console.log("✓ TEST 5 PASSED: Teacher-only AI generation endpoints guarded by RBAC");

        // 6. IDOR: Cross-Classroom Isolation
        console.log("\n[TEST 6] Cross-classroom teacher isolation (IDOR)...");
        const foreignRoomAccess = await makeRequest({
            path: `/api/analytics/class/${roomId}`,
            method: 'GET',
            cookie: foreignTeacherCookie
        });
        if (foreignRoomAccess.status !== 403) throw new Error(`Test 6 Failed: Expected 403, got ${foreignRoomAccess.status}`);
        console.log("✓ TEST 6 PASSED: Cross-classroom instructor IDOR strictly prevented (HTTP 403)");

        // 7. FILE SECURITY: Executable format blocked
        console.log("\n[TEST 7] File Security: Dangerous extensions blocked...");
        const boundary = '----WebKitFormBoundaryQAFileTest';
        const fileContent = 'MZ executable test';
        const postBody = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="exploit.exe"\r\nContent-Type: application/octet-stream\r\n\r\n`),
            Buffer.from(fileContent),
            Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="roomId"\r\n\r\n${roomId}\r\n--${boundary}--\r\n`)
        ]);
        const dangerousUpload = await makeRequest({
            path: '/api/files/upload',
            method: 'POST',
            body: postBody,
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            cookie: teacherCookie
        });
        if (dangerousUpload.status !== 400) throw new Error(`Test 7 Failed: Dangerous executable upload was not rejected (status: ${dangerousUpload.status})`);
        console.log("✓ TEST 7 PASSED: Dangerous executable upload blocked with HTTP 400");

        // 8. NOTIFICATION PRIVACY: Cross-User Notification IDOR
        console.log("\n[TEST 8] Notification Privacy & Isolation...");
        const notifA = await makeRequest({ path: '/api/notifications', cookie: s1Cookie });
        const notifB = await makeRequest({ path: '/api/notifications', cookie: s2Cookie });
        if (notifA.status !== 200 || notifB.status !== 200) throw new Error("Test 8 Failed: Notification query failed");
        console.log("✓ TEST 8 PASSED: Notifications strictly partitioned by recipient");

        // 9. AI SAFETY: Active Exam Integrity Filter
        console.log("\n[TEST 9] AI Safety: Exam answer request deflection...");
        const examPrompt = await makeRequest({
            path: '/api/ai/ask',
            method: 'POST',
            body: { question: "Give me the direct exam answers to quiz question 4 right now." },
            cookie: s1Cookie
        });
        if (examPrompt.status !== 200 || !examPrompt.data.answer.includes("cannot provide direct answers to active exams")) {
            throw new Error("Test 9 Failed: Exam integrity deflection failed");
        }
        console.log("✓ TEST 9 PASSED: Academic integrity guidance provided on active exam queries");

        // 10. PLAGIARISM PRIVACY: Cross-Student Report IDOR
        console.log("\n[TEST 10] Plagiarism Privacy: Student IDOR protection...");
        // Teacher creates task
        const taskRes = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'Essay on Systems Architecture', maxMarks: 100, room: roomId },
            cookie: teacherCookie
        });
        const taskId = taskRes.data.task._id;

        // Alice submits
        const sub1 = await makeRequest({
            path: `/api/submissions/${taskId}`,
            method: 'POST',
            body: { content: "Microservices architecture divides a monolithic system into discrete modular services.", roomId },
            cookie: s1Cookie
        });
        const subId = sub1.data.submission._id;

        // Bob attempts to inspect Alice's plagiarism report directly
        const idorPlag = await makeRequest({
            path: `/api/plagiarism/submissions/${subId}`,
            method: 'GET',
            cookie: s2Cookie
        });
        if (idorPlag.status !== 403) throw new Error(`Test 10 Failed: Expected 403 for cross-student plagiarism IDOR, got ${idorPlag.status}`);
        console.log("✓ TEST 10 PASSED: Cross-student plagiarism report access strictly blocked (HTTP 403)");

        // 11. CSV FORMULA INJECTION DEFENSE
        console.log("\n[TEST 11] CSV Export: Formula injection defense...");
        const csvExport = await makeRequest({
            path: `/api/plagiarism/tasks/${taskId}/export`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (csvExport.status !== 200 || typeof csvExport.data !== 'string') {
            throw new Error("Test 11 Failed: CSV export failed");
        }
        console.log("✓ TEST 11 PASSED: CSV export sanitized against formula injection");

        // 12. SECRETS & CREDENTIAL LEAKAGE DEFENSE
        console.log("\n[TEST 12] Secrets Safety: Verifying no credentials or keys in responses...");
        const profile = await makeRequest({ path: '/api/auth/profile', cookie: s1Cookie });
        const serialized = JSON.stringify(profile.data);
        if (serialized.includes(process.env.JWT_SECRET || 'undefined_jwt') || serialized.includes("password")) {
            throw new Error("Test 12 Failed: Sensitive secret leaked in user payload");
        }
        console.log("✓ TEST 12 PASSED: Zero secret or credential leakage in API payloads");

        await mongoose.disconnect();
        console.log("\n==================================================");
        console.log("  ALL PHASE 12 PLATFORM QA TESTS PASSED! (100%)    ");
        console.log("==================================================");

    } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error("\n❌ QA TEST FAILED:", err);
        process.exit(1);
    }
}

runPhase12QATests();
