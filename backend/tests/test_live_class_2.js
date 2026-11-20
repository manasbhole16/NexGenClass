const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manas-nexgen';

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

function createMultipartBody(fields, files) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const buffers = [];

    for (const [key, value] of Object.entries(fields)) {
        buffers.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        ));
    }

    for (const f of files) {
        buffers.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${f.fieldname || 'files'}"; filename="${f.filename}"\r\nContent-Type: ${f.contentType || 'application/octet-stream'}\r\n\r\n`
        ));
        buffers.push(Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content));
        buffers.push(Buffer.from('\r\n'));
    }

    buffers.push(Buffer.from(`--${boundary}--\r\n`));
    const finalBuffer = Buffer.concat(buffers);

    return {
        boundary,
        body: finalBuffer,
        contentType: `multipart/form-data; boundary=${boundary}`
    };
}

async function runLiveClass2Tests() {
    console.log("==================================================");
    console.log("  PHASE 10: LIVE VIRTUAL CLASSROOM & WHITEBOARD   ");
    console.log("==================================================");

    try {
        await mongoose.connect(MONGO_URI);
        const ts = Date.now();
        const teacherEmail = `live_teacher_${ts}@test.com`;
        const foreignTeacherEmail = `live_foreign_teacher_${ts}@test.com`;
        const student1Email = `live_s1_${ts}@test.com`;
        const student2Email = `live_s2_${ts}@test.com`;
        const password = 'Password123!';

        // Setup Users
        console.log("\n[SETUP] Registering test instructors and students...");
        const tSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Maxwell', email: teacherEmail, password, role: 'teacher' } });
        const ftSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Foreign', email: foreignTeacherEmail, password, role: 'teacher' } });
        const s1Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Charlie Live-Learner', email: student1Email, password, role: 'student' } });
        const s2Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'David External', email: student2Email, password, role: 'student' } });

        const teacherCookie = tSign.cookie;
        const foreignTeacherCookie = ftSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const s1Id = s1Sign.data.user._id;

        // Setup Classroom
        console.log("\n[SETUP] Initializing classroom and enrolling Student 1...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-1001 Distributed Systems ${ts}`, section: 'A', subject: 'Cloud Computing' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });
        console.log(`✓ Classroom ${roomId} initialized with Alice enrolled (Bob unenrolled).`);

        // TEST 1: Teacher creates scheduled live session
        console.log("\n[TEST 1] Teacher creates scheduled live class...");
        const schedTime = new Date(Date.now() + 3600000).toISOString();
        const createRes = await makeRequest({
            path: `/api/live-sessions/rooms/${roomId}`,
            method: 'POST',
            body: { title: 'Lecture 1: Consensus Protocols', description: 'Paxos and Raft consensus', scheduledAt: schedTime },
            cookie: teacherCookie
        });
        if (createRes.status !== 201 || !createRes.data.session) {
            throw new Error(`Test 1 Failed: Expected 201, got ${createRes.status}`);
        }
        const sessionId = createRes.data.session._id;
        console.log(`✓ TEST 1 PASSED: Live session scheduled (Session ID: ${sessionId})`);

        // TEST 2: Student attempts live session creation (RBAC)
        console.log("\n[TEST 2] Student attempts to create live class...");
        const studentCreate = await makeRequest({
            path: `/api/live-sessions/rooms/${roomId}`,
            method: 'POST',
            body: { title: 'Student Study Group' },
            cookie: s1Cookie
        });
        if (studentCreate.status !== 403) {
            throw new Error(`Test 2 Failed: Expected 403 for student creation, got ${studentCreate.status}`);
        }
        console.log("✓ TEST 2 PASSED: Student blocked from creating live sessions (HTTP 403)");

        // TEST 3 & 4: Unenrolled user cannot access live session
        console.log("\n[TEST 3 & 4] Unenrolled student (David) attempts to access live session...");
        const unauthGet = await makeRequest({
            path: `/api/live-sessions/${sessionId}`,
            method: 'GET',
            cookie: s2Cookie
        });
        if (unauthGet.status !== 403) {
            throw new Error(`Test 3/4 Failed: Expected 403 for unenrolled user, got ${unauthGet.status}`);
        }
        console.log("✓ TEST 3 & 4 PASSED: Classroom isolation strictly blocks unenrolled users (HTTP 403)");

        // TEST 5 & 6: Student cannot start live session
        console.log("\n[TEST 5 & 6] Student attempts to start teacher's live session...");
        const studentStart = await makeRequest({
            path: `/api/live-sessions/${sessionId}/start`,
            method: 'POST',
            cookie: s1Cookie
        });
        if (studentStart.status !== 403) {
            throw new Error(`Test 5/6 Failed: Expected 403 for student start, got ${studentStart.status}`);
        }
        console.log("✓ TEST 5 & 6 PASSED: Non-instructor blocked from starting live session (HTTP 403)");

        // TEST 7: Teacher starts live session
        console.log("\n[TEST 7] Teacher starts live session...");
        const startRes = await makeRequest({
            path: `/api/live-sessions/${sessionId}/start`,
            method: 'POST',
            cookie: teacherCookie
        });
        if (startRes.status !== 200 || startRes.data.session.status !== 'live') {
            throw new Error(`Test 7 Failed: Expected live status, got ${startRes.status}`);
        }
        console.log("✓ TEST 7 PASSED: Live session transition to 'live' status verified");

        // TEST 8: Student joins running live session
        console.log("\n[TEST 8] Enrolled student joins running live session...");
        const joinRes = await makeRequest({
            path: `/api/live-sessions/${sessionId}/join`,
            method: 'POST',
            cookie: s1Cookie
        });
        if (joinRes.status !== 200 || !joinRes.data.joined) {
            throw new Error(`Test 8 Failed: Expected joined=true, got ${joinRes.status}`);
        }
        console.log("✓ TEST 8 PASSED: Enrolled student joined live session");

        // TEST 9 & 10: Teacher toggles whiteboard drawing permission
        console.log("\n[TEST 9 & 10] Teacher modifies collaborative whiteboard drawing permission...");
        const wbPerm = await makeRequest({
            path: `/api/live-sessions/${sessionId}/whiteboard-permission`,
            method: 'POST',
            body: { studentsCanDraw: false },
            cookie: teacherCookie
        });
        if (wbPerm.status !== 200 || wbPerm.data.studentsCanDraw !== false) {
            throw new Error(`Test 9/10 Failed: Expected studentsCanDraw: false, got ${wbPerm.status}`);
        }

        const studentWbPerm = await makeRequest({
            path: `/api/live-sessions/${sessionId}/whiteboard-permission`,
            method: 'POST',
            body: { studentsCanDraw: true },
            cookie: s1Cookie
        });
        if (studentWbPerm.status !== 403) {
            throw new Error(`Test 10 Failed: Expected 403 for student modifying wb permission, got ${studentWbPerm.status}`);
        }
        console.log("✓ TEST 9 & 10 PASSED: Whiteboard drawing permissions strictly controlled by instructor");

        // TEST 11: Save collaborative whiteboard vector state
        console.log("\n[TEST 11] Saving collaborative whiteboard operations...");
        const wbSave = await makeRequest({
            path: `/api/live-sessions/${sessionId}/whiteboard`,
            method: 'POST',
            body: { whiteboardState: [{ tool: 'pencil', color: '#8B5CF6', width: 4, points: [{ x: 10, y: 10 }, { x: 50, y: 50 }] }] },
            cookie: teacherCookie
        });
        if (wbSave.status !== 200) {
            throw new Error(`Test 11 Failed: Save whiteboard state returned ${wbSave.status}`);
        }
        console.log("✓ TEST 11 PASSED: Whiteboard vector state successfully persisted");

        // TEST 12: Teacher moderation - Kick participant
        console.log("\n[TEST 12] Teacher removes participant from live class...");
        const kickRes = await makeRequest({
            path: `/api/live-sessions/${sessionId}/kick/${s1Id}`,
            method: 'POST',
            cookie: teacherCookie
        });
        if (kickRes.status !== 200) {
            throw new Error(`Test 12 Failed: Kick participant returned ${kickRes.status}`);
        }

        const studentKick = await makeRequest({
            path: `/api/live-sessions/${sessionId}/kick/${s1Id}`,
            method: 'POST',
            cookie: s1Cookie
        });
        if (studentKick.status !== 403) {
            throw new Error(`Test 12 Failed: Student kick returned ${studentKick.status}`);
        }
        console.log("✓ TEST 12 PASSED: Teacher moderation (kick) verified with RBAC enforcement");

        // TEST 13 & 14: Teacher ends live session and triggers Attendance 2.0 calculation
        console.log("\n[TEST 13 & 14] Teacher ends live session and triggers Attendance 2.0...");
        const endRes = await makeRequest({
            path: `/api/live-sessions/${sessionId}/end`,
            method: 'POST',
            cookie: teacherCookie
        });
        if (endRes.status !== 200 || endRes.data.session.status !== 'ended') {
            throw new Error(`Test 13/14 Failed: End session returned ${endRes.status}`);
        }
        if (!endRes.data.session.attendanceGenerated) {
            throw new Error(`Test 14 Failed: Attendance record was not generated on session completion`);
        }
        console.log(`✓ TEST 13 & 14 PASSED: Live session ended & Attendance 2.0 automatically calculated (Attendance Session ID: ${endRes.data.session.attendanceSessionId})`);

        // TEST 15 & 16: Live Attendance Privacy
        console.log("\n[TEST 15 & 16] Verifying Live Attendance privacy isolation...");
        const studentAtt = await makeRequest({
            path: `/api/live-sessions/${sessionId}/attendance`,
            method: 'GET',
            cookie: s1Cookie
        });
        if (studentAtt.status !== 200 || studentAtt.data.isTeacher || !studentAtt.data.record) {
            throw new Error(`Test 15 Failed: Student received invalid attendance view`);
        }

        const teacherAtt = await makeRequest({
            path: `/api/live-sessions/${sessionId}/attendance`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (teacherAtt.status !== 200 || !teacherAtt.data.isTeacher || !Array.isArray(teacherAtt.data.roster)) {
            throw new Error(`Test 16 Failed: Teacher received invalid classroom roster view`);
        }
        console.log("✓ TEST 15 & 16 PASSED: Attendance privacy verified (Student sees own record; Teacher sees classroom roster)");

        // TEST 17: Rejoin ended session rejected
        console.log("\n[TEST 17] Student attempts to join ended session...");
        const joinEnded = await makeRequest({
            path: `/api/live-sessions/${sessionId}/join`,
            method: 'POST',
            cookie: s1Cookie
        });
        if (joinEnded.status !== 400) {
            throw new Error(`Test 17 Failed: Expected 400 for ended session, got ${joinEnded.status}`);
        }
        console.log("✓ TEST 17 PASSED: Ended live session prevents new joins (HTTP 400)");

        // TEST 18: Attach recorded video file via Phase 8 File integration
        console.log("\n[TEST 18] Teacher attaches lecture recording to Live Session...");
        const sampleVideo = Buffer.from("RIFF....WEBMVIDEOSTREAMFAKECHUNK");
        const mp = createMultipartBody(
            { duration: 3600 },
            [{ filename: 'Lecture_Consensus.webm', contentType: 'video/webm', content: sampleVideo }]
        );
        const recordRes = await makeRequest({
            path: `/api/live-sessions/${sessionId}/recording`,
            method: 'POST',
            body: mp.body,
            headers: { 'Content-Type': mp.contentType },
            cookie: teacherCookie
        });
        if (recordRes.status !== 201 || !recordRes.data.file) {
            throw new Error(`Test 18 Failed: Recording upload returned ${recordRes.status}`);
        }
        console.log(`✓ TEST 18 PASSED: Live lecture recording attached via canonical File model (File ID: ${recordRes.data.file._id})`);

        // TEST 19: Foreign Teacher IDOR protection
        console.log("\n[TEST 19] Foreign teacher attempts to view classroom live session...");
        const foreignGet = await makeRequest({
            path: `/api/live-sessions/${sessionId}`,
            method: 'GET',
            cookie: foreignTeacherCookie
        });
        if (foreignGet.status !== 403) {
            throw new Error(`Test 19 Failed: Expected 403 for foreign teacher IDOR, got ${foreignGet.status}`);
        }
        console.log("✓ TEST 19 PASSED: Cross-classroom teacher IDOR strictly blocked (HTTP 403)");

        // TEST 20: Query Classroom Live Session History
        console.log("\n[TEST 20] Retrieving classroom live session history...");
        const historyRes = await makeRequest({
            path: `/api/live-sessions/rooms/${roomId}/history`,
            method: 'GET',
            cookie: s1Cookie
        });
        if (historyRes.status !== 200 || !Array.isArray(historyRes.data.sessions) || historyRes.data.sessions.length === 0) {
            throw new Error(`Test 20 Failed: History returned ${historyRes.status}`);
        }
        console.log(`✓ TEST 20 PASSED: Classroom live session history retrieved (${historyRes.data.sessions.length} sessions)`);

        await mongoose.disconnect();
        console.log("\n==================================================");
        console.log("  ALL PHASE 10 LIVE CLASS TESTS PASSED! (100%)    ");
        console.log("==================================================");

    } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runLiveClass2Tests();
