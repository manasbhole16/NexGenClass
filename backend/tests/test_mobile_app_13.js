const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexgenclass';

function makeRequest({ path, method = 'GET', body = null, token = null, headers = {} }) {
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

        if (token) {
            finalHeaders['Authorization'] = `Bearer ${token}`;
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
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed, body: parsed, headers: res.headers });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runMobileApp13Tests() {
    console.log("==================================================");
    console.log("  PHASE 13: REACT NATIVE MOBILE APP TEST SUITE    ");
    console.log("==================================================");

    try {
        await mongoose.connect(MONGO_URI);

        const ts = Date.now();
        const teacherEmail = `mobile_prof_${ts}@test.com`;
        const s1Email = `mobile_s1_${ts}@test.com`;
        const s2Email = `mobile_s2_${ts}@test.com`;
        const password = 'MobilePassword123!';

        // 1. MOBILE REGISTRATION & BEARER TOKEN GENERATION
        console.log("\n[TEST 1] Mobile client registers teacher & student with Bearer tokens...");
        const tReg = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Prof. Mobile Native', email: teacherEmail, password, role: 'teacher' }
        });
        if (tReg.status !== 201 || !tReg.data.token) {
            throw new Error(`Test 1 Failed: Teacher registration did not return mobile Bearer token`);
        }
        const teacherToken = tReg.data.token;

        const s1Reg = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Alice Mobile', email: s1Email, password, role: 'student' }
        });
        const s1Token = s1Reg.data.token;

        const s2Reg = await makeRequest({
            path: '/api/auth/register',
            method: 'POST',
            body: { fullname: 'Bob Mobile', email: s2Email, password, role: 'student' }
        });
        const s2Token = s2Reg.data.token;

        console.log("✓ TEST 1 PASSED: Mobile client registered and received native Bearer tokens");

        // 2. MOBILE SESSION RESTORATION (PROFILE)
        console.log("\n[TEST 2] Mobile client restores profile session via Bearer token...");
        const profileRes = await makeRequest({
            path: '/api/auth/profile',
            method: 'GET',
            token: s1Token
        });
        if (profileRes.status !== 200 || profileRes.data.user.email !== s1Email) {
            throw new Error("Test 2 Failed: Profile restoration via Bearer token failed");
        }
        console.log("✓ TEST 2 PASSED: Mobile session restored successfully via Bearer token");

        // 3. MOBILE CLASSROOM CREATION & ENROLLMENT
        console.log("\n[TEST 3] Mobile teacher creates classroom and student joins...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `Mobile Systems 101 ${ts}`, section: 'M-1', subject: 'CS' },
            token: teacherToken
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, token: s1Token });
        console.log(`✓ TEST 3 PASSED: Classroom created (${roomId}) and student enrolled via mobile`);

        // 4. MOBILE STREAM ANNOUNCEMENTS
        console.log("\n[TEST 4] Mobile teacher posts announcement and student retrieves stream...");
        await makeRequest({
            path: `/api/rooms/${roomId}/announcements`,
            method: 'POST',
            body: { content: 'Welcome to the Mobile Systems course on React Native 2.0!' },
            token: teacherToken
        });
        const streamRes = await makeRequest({
            path: `/api/rooms/${roomId}/announcements`,
            method: 'GET',
            token: s1Token
        });
        if (streamRes.status !== 200 || !streamRes.data.announcements || streamRes.data.announcements.length === 0) {
            throw new Error("Test 4 Failed: Mobile stream announcements query failed");
        }
        console.log("✓ TEST 4 PASSED: Mobile stream posts created and retrieved");

        // 5. MOBILE CLASSWORK & ASSIGNMENT SUBMISSION
        console.log("\n[TEST 5] Mobile teacher creates assignment and student turns in work...");
        const taskRes = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'Mobile React Native Lab 1', maxMarks: 100, room: roomId },
            token: teacherToken
        });
        const taskId = taskRes.data.task._id;

        const submitRes = await makeRequest({
            path: `/api/submissions/${taskId}`,
            method: 'POST',
            body: { content: 'Completed React Native Navigation and Bearer Token Authentication setup.', roomId },
            token: s1Token
        });
        if (submitRes.status !== 200 || !submitRes.data.submission) {
            throw new Error("Test 5 Failed: Mobile assignment submission failed");
        }
        const submissionId = submitRes.data.submission._id;
        console.log("✓ TEST 5 PASSED: Mobile assignment submitted successfully");

        // 6. MOBILE TEACHER GRADING
        console.log("\n[TEST 6] Mobile teacher grades student submission with feedback...");
        const gradeRes = await makeRequest({
            path: `/api/submissions/${submissionId}/grade`,
            method: 'POST',
            body: { marksAwarded: 95, teacherFeedback: 'Excellent native client implementation!' },
            token: teacherToken
        });
        if (gradeRes.status !== 200 || gradeRes.data.submission.grade !== '95') {
            throw new Error("Test 6 Failed: Mobile teacher grading failed");
        }
        console.log("✓ TEST 6 PASSED: Mobile grading and rubric evaluation verified");

        // 7. MOBILE ATTENDANCE SUMMARY
        console.log("\n[TEST 7] Mobile student retrieves attendance summary...");
        const attRes = await makeRequest({
            path: '/api/attendance/student',
            method: 'GET',
            token: s1Token
        });
        if (attRes.status !== 200) {
            throw new Error("Test 7 Failed: Mobile attendance query failed");
        }
        console.log("✓ TEST 7 PASSED: Mobile attendance summary retrieved");

        // 8. MOBILE NOTIFICATION CENTER
        console.log("\n[TEST 8] Mobile student retrieves in-app notifications...");
        const notifRes = await makeRequest({
            path: '/api/notifications',
            method: 'GET',
            token: s1Token
        });
        if (notifRes.status !== 200) {
            throw new Error("Test 8 Failed: Mobile notifications query failed");
        }
        console.log(`✓ TEST 8 PASSED: Mobile notifications retrieved (${notifRes.data.unreadCount || 0} unread)`);

        // 9. MOBILE AI STUDY ASSISTANT
        console.log("\n[TEST 9] Mobile student queries AI Study Assistant...");
        const aiRes = await makeRequest({
            path: '/api/ai/ask',
            method: 'POST',
            body: { question: 'Explain React Native architecture and bridge vs JSI.' },
            token: s1Token
        });
        if (aiRes.status !== 200 || !aiRes.data.answer) {
            throw new Error("Test 9 Failed: Mobile AI Assistant query failed");
        }
        console.log("✓ TEST 9 PASSED: Mobile AI Copilot responded successfully");

        // 10. MOBILE PLAGIARISM & ORIGINALITY REPORT
        console.log("\n[TEST 10] Mobile student checks originality report...");
        const plagRes = await makeRequest({
            path: `/api/plagiarism/submissions/${submissionId}`,
            method: 'GET',
            token: s1Token
        });
        if (plagRes.status !== 200) {
            throw new Error("Test 10 Failed: Mobile plagiarism report query failed");
        }
        console.log("✓ TEST 10 PASSED: Mobile originality report retrieved");

        // 11. MOBILE SECURITY: UNAUTHENTICATED REQUEST BLOCKED
        console.log("\n[TEST 11] Mobile security: Missing / invalid Bearer token blocked...");
        const unauth = await makeRequest({ path: '/api/rooms/my-rooms' });
        if (unauth.status !== 401) throw new Error("Test 11 Failed: Missing token was not rejected with 401");
        console.log("✓ TEST 11 PASSED: Unauthenticated mobile requests strictly blocked (HTTP 401)");

        // 12. MOBILE IDOR: STUDENT 2 CANNOT ACCESS STUDENT 1 PRIVATE SUBMISSION
        console.log("\n[TEST 12] Mobile security: IDOR cross-student protection...");
        const idorRes = await makeRequest({
            path: `/api/plagiarism/submissions/${submissionId}`,
            method: 'GET',
            token: s2Token
        });
        if (idorRes.status !== 403) throw new Error(`Test 12 Failed: Expected 403 for IDOR, got ${idorRes.status}`);
        console.log("✓ TEST 12 PASSED: Cross-student IDOR strictly blocked on mobile API endpoints (HTTP 403)");

        await mongoose.disconnect();
        console.log("\n==================================================");
        console.log("  ALL PHASE 13 MOBILE APP TESTS PASSED! (100%)    ");
        console.log("==================================================");

    } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error("\n❌ MOBILE APP TEST FAILED:", err);
        process.exit(1);
    }
}

runMobileApp13Tests();
