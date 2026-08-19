const http = require('http');
require('dotenv').config();

const API_HOST = '127.0.0.1';
const API_PORT = 3000;

function makeRequest({ path, method = 'GET', body = null, cookie = null }) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const headers = {
            'Content-Type': 'application/json'
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
                const match = cookieStr.match(/token=[^;]+/);
                if (match) tokenCookie = match[0];
            }

            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, cookie: tokenCookie, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data, cookie: tokenCookie, headers: res.headers });
                }
            });
        });

        req.on('error', err => reject(err));
        if (postData) req.write(postData);
        req.end();
    });
}

async function runSecurityAuditTestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS FULL SECURITY & IDOR AUDIT TEST SUITE");
    console.log("==================================================");

    const ts = Date.now();
    const teacherEmail = `sec_teacher_${ts}@nexgen.com`;
    const foreignTeacherEmail = `sec_foreign_t_${ts}@nexgen.com`;
    const student1Email = `sec_student1_${ts}@nexgen.com`;
    const student2Email = `sec_student2_${ts}@nexgen.com`;

    // 0. Setup Users
    console.log("\n[SETUP] Creating test users...");
    const teacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Turing', email: teacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherReg.cookie;
    const teacherId = teacherReg.data.user._id;

    const foreignTeacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Neumann', email: foreignTeacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherReg.cookie;

    const student1Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Alice Student', email: student1Email, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Reg.cookie;
    const student1Id = student1Reg.data.user._id;

    const student2Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Bob Student', email: student2Email, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Reg.cookie;
    const student2Id = student2Reg.data.user._id;

    // Create Classroom A (Owned by Teacher)
    const roomARes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: 'Classroom A - Security Lab', section: 'SEC-101', subject: 'Cybersecurity' }
    });
    const roomAId = roomARes.data.room._id;
    const roomACode = roomARes.data.room.code;

    // Student 1 joins Classroom A
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: roomACode } });

    // Create Classroom B (Owned by Foreign Teacher)
    const roomBRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: foreignTeacherCookie,
        body: { name: 'Classroom B - Distributed Systems', section: 'CS-801', subject: 'Computer Science' }
    });
    const roomBId = roomBRes.data.room._id;
    const roomBCode = roomBRes.data.room.code;

    // Student 2 joins Classroom B
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: roomBCode } });

    // Teacher creates Assignment in Classroom A
    const taskARes = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Assignment 1: Cryptographic Hashes',
            roomId: roomAId,
            maxMarks: 100,
            dueDate: new Date(Date.now() + 86400000)
        }
    });
    const taskAId = taskARes.data.task._id;

    // Student 1 submits work for Assignment in Classroom A
    const subARes = await makeRequest({
        path: `/api/submissions/${taskAId}`,
        method: 'POST',
        cookie: student1Cookie,
        body: { content: 'Here is my crypto solution in sha256.' }
    });
    const subAId = subARes.data.submission._id;

    // Teacher creates Quiz in Classroom A
    const quizARes = await makeRequest({
        path: '/api/quiz/create',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Quiz 1: Public Key Cryptography',
            roomId: roomAId,
            timeLimit: 15,
            totalMarks: 20,
            isPublished: true,
            deadline: new Date(Date.now() + 86400000)
        }
    });
    const quizAId = quizARes.data.quiz._id;

    // Teacher creates Draft Quiz in Classroom A
    const draftQuizRes = await makeRequest({
        path: '/api/quiz/create',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Draft Exam - Unpublished',
            roomId: roomAId,
            timeLimit: 30,
            totalMarks: 50,
            isPublished: false,
            deadline: new Date(Date.now() + 86400000)
        }
    });
    const draftQuizId = draftQuizRes.data.quiz._id;

    console.log(`✓ Test fixtures created (Room A: ${roomAId}, Room B: ${roomBId})`);

    // SEC-01: Student cannot grade submission (403)
    console.log("\n[SEC-01] Student -> grade submission...");
    const sec01 = await makeRequest({
        path: `/api/submissions/grade/${subAId}`,
        method: 'POST',
        cookie: student1Cookie,
        body: { marksAwarded: 100, teacherFeedback: 'Self-graded 100!' }
    });
    if (sec01.status !== 403) throw new Error(`SEC-01 Failed: Expected 403, got ${sec01.status}`);
    console.log("✓ SEC-01 PASSED: Student grade submission blocked with HTTP 403");

    // SEC-02: Student cannot view all submissions for task (403)
    console.log("\n[SEC-02] Student -> view task submissions...");
    const sec02 = await makeRequest({
        path: `/api/submissions/task/${taskAId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (sec02.status !== 403) throw new Error(`SEC-02 Failed: Expected 403, got ${sec02.status}`);
    console.log("✓ SEC-02 PASSED: Student viewing all submissions blocked with HTTP 403");

    // SEC-03: Student cannot access quiz analytics (403)
    console.log("\n[SEC-03] Student -> quiz analytics...");
    const sec03 = await makeRequest({
        path: `/api/quiz/${quizAId}/analytics`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (sec03.status !== 403) throw new Error(`SEC-03 Failed: Expected 403, got ${sec03.status}`);
    console.log("✓ SEC-03 PASSED: Student access to quiz analytics blocked with HTTP 403");

    // SEC-04: Student cannot modify quiz (403)
    console.log("\n[SEC-04] Student -> modify quiz...");
    const sec04 = await makeRequest({
        path: `/api/quiz/${quizAId}`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { title: 'Hacked Quiz Title' }
    });
    if (sec04.status !== 403) throw new Error(`SEC-04 Failed: Expected 403, got ${sec04.status}`);
    console.log("✓ SEC-04 PASSED: Student modifying quiz blocked with HTTP 403");

    // SEC-05: Student cannot publish/unpublish quiz (403)
    console.log("\n[SEC-05] Student -> publish quiz...");
    const sec05 = await makeRequest({
        path: `/api/quiz/${quizAId}/publish`,
        method: 'POST',
        cookie: student1Cookie
    });
    if (sec05.status !== 403) throw new Error(`SEC-05 Failed: Expected 403, got ${sec05.status}`);
    console.log("✓ SEC-05 PASSED: Student publishing quiz blocked with HTTP 403");

    // SEC-06: Student cannot access draft quiz (403)
    console.log("\n[SEC-06] Student -> access draft quiz...");
    const sec06 = await makeRequest({
        path: `/api/quiz/${draftQuizId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (sec06.status !== 403) throw new Error(`SEC-06 Failed: Expected 403, got ${sec06.status}`);
    console.log("✓ SEC-06 PASSED: Student access to draft quiz blocked with HTTP 403");

    // SEC-07: Foreign teacher cannot access classroom analytics (403)
    console.log("\n[SEC-07] Foreign teacher -> classroom quiz analytics...");
    const sec07 = await makeRequest({
        path: `/api/quiz/${quizAId}/analytics`,
        method: 'GET',
        cookie: foreignTeacherCookie
    });
    if (sec07.status !== 403) throw new Error(`SEC-07 Failed: Expected 403, got ${sec07.status}`);
    console.log("✓ SEC-07 PASSED: Foreign teacher classroom analytics blocked with HTTP 403");

    // SEC-08: Foreign teacher cannot access classroom settings (403)
    console.log("\n[SEC-08] Foreign teacher -> classroom settings...");
    const sec08 = await makeRequest({
        path: `/api/rooms/${roomAId}/settings`,
        method: 'GET',
        cookie: foreignTeacherCookie
    });
    if (sec08.status !== 403) throw new Error(`SEC-08 Failed: Expected 403, got ${sec08.status}`);
    console.log("✓ SEC-08 PASSED: Foreign teacher classroom settings blocked with HTTP 403");

    // SEC-09: Foreign teacher cannot edit assignment in another classroom (403)
    console.log("\n[SEC-09] Foreign teacher -> edit assignment in another room...");
    const sec09 = await makeRequest({
        path: `/api/tasks/${taskAId}`,
        method: 'PUT',
        cookie: foreignTeacherCookie,
        body: { title: 'Foreign Teacher Modified Assignment' }
    });
    if (sec09.status !== 403) throw new Error(`SEC-09 Failed: Expected 403, got ${sec09.status}`);
    console.log("✓ SEC-09 PASSED: Foreign teacher editing assignment blocked with HTTP 403");

    // SEC-10: Foreign teacher cannot grade student submission in another room (403)
    console.log("\n[SEC-10] Foreign teacher -> grade submission in another room...");
    const sec10 = await makeRequest({
        path: `/api/submissions/grade/${subAId}`,
        method: 'POST',
        cookie: foreignTeacherCookie,
        body: { marksAwarded: 50, teacherFeedback: 'Foreign grade' }
    });
    if (sec10.status !== 403) throw new Error(`SEC-10 Failed: Expected 403, got ${sec10.status}`);
    console.log("✓ SEC-10 PASSED: Foreign teacher grading submission blocked with HTTP 403");

    // SEC-11: Non-enrolled student cannot access tasks in another classroom (403)
    console.log("\n[SEC-11] Non-enrolled student -> access tasks in room A...");
    const sec11 = await makeRequest({
        path: `/api/tasks?roomId=${roomAId}`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (sec11.status !== 403) throw new Error(`SEC-11 Failed: Expected 403, got ${sec11.status}`);
    console.log("✓ SEC-11 PASSED: Non-enrolled student room tasks access blocked with HTTP 403");

    // SEC-12: Student 2 cannot access Student 1's quiz result (403)
    console.log("\n[SEC-12] Student 2 -> access Student 1 quiz result (IDOR)...");
    const sec12 = await makeRequest({
        path: `/api/quiz/${quizAId}/result/${student1Id}`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (sec12.status !== 403) throw new Error(`SEC-12 Failed: Expected 403, got ${sec12.status}`);
    console.log("✓ SEC-12 PASSED: Cross-student quiz IDOR blocked with HTTP 403");

    // SEC-13: Student 2 cannot start quiz in room they are not enrolled in (403)
    console.log("\n[SEC-13] Student 2 -> start quiz in non-enrolled classroom...");
    const sec13 = await makeRequest({
        path: `/api/quiz/${quizAId}/start`,
        method: 'POST',
        cookie: student2Cookie
    });
    if (sec13.status !== 403) throw new Error(`SEC-13 Failed: Expected 403, got ${sec13.status}`);
    console.log("✓ SEC-13 PASSED: Non-enrolled student starting quiz blocked with HTTP 403");

    // SEC-14: Malformed / Manipulated ObjectId safely rejected with 400
    console.log("\n[SEC-14] Malformed ObjectId handling in endpoints...");
    const sec14a = await makeRequest({ path: '/api/quiz/invalid-object-id', method: 'GET', cookie: teacherCookie });
    const sec14b = await makeRequest({ path: '/api/quiz/invalid-id/analytics', method: 'GET', cookie: teacherCookie });
    if (sec14a.status !== 400 || sec14b.status !== 400) {
        throw new Error(`SEC-14 Failed: Expected 400 for malformed IDs, got ${sec14a.status} and ${sec14b.status}`);
    }
    console.log("✓ SEC-14 PASSED: Manipulated / invalid ObjectIds safely rejected with HTTP 400");

    // SEC-15: Unauthenticated request rejected with 401
    console.log("\n[SEC-15] Unauthenticated request rejection...");
    const sec15 = await makeRequest({ path: `/api/quiz/${quizAId}/analytics`, method: 'GET', cookie: null });
    if (sec15.status !== 401) throw new Error(`SEC-15 Failed: Expected 401, got ${sec15.status}`);
    console.log("✓ SEC-15 PASSED: Unauthenticated request rejected with HTTP 401");

    console.log("\n==================================================");
    console.log("ALL 15 SECURITY & IDOR AUDIT TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runSecurityAuditTestSuite().catch(err => {
    console.error("Security Test Suite Failure:", err);
    process.exit(1);
});
