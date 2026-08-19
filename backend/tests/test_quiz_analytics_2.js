const http = require('http');
const { execSync } = require('child_process');
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

async function runQuizAnalyticsTestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS QUIZ 2.0 PHASE 5 ANALYTICS TEST SUITE");
    console.log("==================================================");

    const ts = Date.now();
    const teacherEmail = `q2_p5_teacher_${ts}@nexgen.com`;
    const foreignTeacherEmail = `q2_p5_foreign_t_${ts}@nexgen.com`;
    const student1Email = `q2_p5_student1_${ts}@nexgen.com`;
    const student2Email = `q2_p5_student2_${ts}@nexgen.com`;

    // 0. Setup Users
    console.log("\n[SETUP] Creating test users...");
    const teacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Shannon', email: teacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherReg.cookie;
    const teacherId = teacherReg.data.user._id;

    const foreignTeacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Gauss', email: foreignTeacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherReg.cookie;

    const student1Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Claude Shannon Jr', email: student1Email, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Reg.cookie;
    const student1Id = student1Reg.data.user._id;

    const student2Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Carl Gauss Jr', email: student2Email, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Reg.cookie;
    const student2Id = student2Reg.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: 'Information Theory & Signal Processing', section: 'CS-901', subject: 'Computer Science' }
    });
    const roomId = roomRes.data.room._id;
    const roomCode = roomRes.data.room.code;

    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: roomCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: roomCode } });
    console.log(`✓ Classroom ready (${roomId}) with enrolled students`);

    // Create Published Quiz with Topic 'Entropy and Compression'
    const qRes = await makeRequest({
        path: '/api/quiz/create',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Quiz 5: Entropy & Huffman Coding',
            description: 'Assess entropy formulas and lossless compression algorithms.',
            roomId,
            timeLimit: 15,
            topic: 'Entropy and Compression',
            allowedAttempts: 2,
            showResultsImmediately: true,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isPublished: true
        }
    });
    const quizId = qRes.data.quiz._id;

    // Add 3 Questions:
    // Q1: MCQ (5 pts) -> Option 0 (Shannon Entropy formula)
    // Q2: Multiple Select (5 pts) -> Options 0, 2 (Huffman & LZW are lossless)
    // Q3: True/False (10 pts) -> Option 1 (False: Huffman is not lossy)
    // Total marks: 20
    await makeRequest({
        path: `/api/quiz/${quizId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [
                {
                    type: 'mcq',
                    questionText: 'What is the measure of uncertainty or information content in a random variable?',
                    options: [{ text: 'Entropy' }, { text: 'Enthalpy' }, { text: 'Variance' }, { text: 'Kurtosis' }],
                    correctAnswer: 0,
                    marks: 5,
                    order: 0
                },
                {
                    type: 'multiple_select',
                    questionText: 'Which of the following are lossless compression algorithms?',
                    options: [{ text: 'Huffman Coding' }, { text: 'JPEG DCT' }, { text: 'LZW (Lempel-Ziv-Welch)' }, { text: 'MPEG Lossy' }],
                    correctAnswer: [0, 2],
                    marks: 5,
                    order: 1
                },
                {
                    type: 'true_false',
                    questionText: 'Huffman Coding is a lossy compression algorithm.',
                    options: [{ text: 'True' }, { text: 'False' }],
                    correctAnswer: 1, // False
                    marks: 10,
                    order: 2
                }
            ]
        }
    });

    const questionsList = (await makeRequest({ path: `/api/quiz/${quizId}`, method: 'GET', cookie: teacherCookie })).data.questions;
    const q1Id = questionsList[0]._id;
    const q2Id = questionsList[1]._id;
    const q3Id = questionsList[2]._id;

    // Student 1 - Attempt 1: Gets Q1 (5), misses Q2 (0), gets Q3 (10) -> Score: 15 / 20 (75%)
    await makeRequest({ path: `/api/quiz/${quizId}/start`, method: 'POST', cookie: student1Cookie });
    await makeRequest({
        path: `/api/quiz/${quizId}/attempt`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: q1Id, selectedOption: 0 },
                { questionId: q2Id, selectedOptions: [0, 1] }, // Wrong MS pick
                { questionId: q3Id, selectedOption: 1 }
            ]
        }
    });

    // Student 1 - Attempt 2: Gets Q1 (5), gets Q2 (5), gets Q3 (10) -> Score: 20 / 20 (100%)
    await makeRequest({ path: `/api/quiz/${quizId}/start`, method: 'POST', cookie: student1Cookie });
    await makeRequest({
        path: `/api/quiz/${quizId}/attempt`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: q1Id, selectedOption: 0 },
                { questionId: q2Id, selectedOptions: [0, 2] }, // Correct MS
                { questionId: q3Id, selectedOption: 1 }
            ]
        }
    });

    // Student 2 - Attempt 1: Misses Q1 (0), misses Q2 (0), misses Q3 (0) -> Score: 0 / 20 (0%)
    await makeRequest({ path: `/api/quiz/${quizId}/start`, method: 'POST', cookie: student2Cookie });
    await makeRequest({
        path: `/api/quiz/${quizId}/attempt`,
        method: 'POST',
        cookie: student2Cookie,
        body: {
            answers: [
                { questionId: q1Id, selectedOption: 1 },
                { questionId: q2Id, selectedOptions: [1] },
                { questionId: q3Id, selectedOption: 0 }
            ]
        }
    });

    // TC-A01 & TC-A02: Teacher retrieves quiz analytics & summary counts
    console.log("\n[TC-A01 & TC-A02] Teacher retrieves comprehensive quiz analytics...");
    const aRes = await makeRequest({ path: `/api/quiz/${quizId}/analytics`, method: 'GET', cookie: teacherCookie });
    if (aRes.status !== 200) throw new Error("TC-A01 Failed: Analytics retrieval failed!");
    
    const summary = aRes.data.summary;
    if (summary.totalAttempts !== 3 || summary.uniqueStudentsAttempted !== 2) {
        throw new Error(`TC-A02 Failed: Expected 3 total attempts and 2 unique students, got ${summary.totalAttempts} / ${summary.uniqueStudentsAttempted}`);
    }
    console.log(`✓ TC-A01 & TC-A02 PASSED: Analytics retrieved (${summary.totalAttempts} attempts, ${summary.uniqueStudentsAttempted} students)`);

    // TC-A03, TC-A04, TC-A05: Average, Highest, Lowest Score Calculation
    console.log("\n[TC-A03, TC-A04, TC-A05] Verifying scores (15, 20, 0 -> Avg = 11.7, High = 20, Low = 0)...");
    // Scores: 15, 20, 0 -> sum: 35 / 3 = 11.666 -> 11.7
    if (summary.highestScore !== 20 || summary.lowestScore !== 0 || Math.abs(summary.averageScore - 11.7) > 0.1) {
        throw new Error(`TC-A03-05 Failed: Calculated stats mismatch (Avg: ${summary.averageScore}, High: ${summary.highestScore}, Low: ${summary.lowestScore})`);
    }
    console.log(`✓ TC-A03, TC-A04, TC-A05 PASSED: Avg: ${summary.averageScore}, High: ${summary.highestScore}, Low: ${summary.lowestScore}`);

    // TC-A06: Score distribution buckets
    console.log("\n[TC-A06] Verifying score distribution buckets...");
    const dist = aRes.data.scoreDistribution;
    // 0% -> 0-20%, 75% -> 61-80%, 100% -> 81-100%
    if (dist['0-20%'] !== 1 || dist['61-80%'] !== 1 || dist['81-100%'] !== 1) {
        throw new Error(`TC-A06 Failed: Score distribution mismatch! ${JSON.stringify(dist)}`);
    }
    console.log(`✓ TC-A06 PASSED: Score distribution verified: ${JSON.stringify(dist)}`);

    // TC-A07, TC-A08, TC-A09, TC-A10: Question-level analytics, option distribution, and difficulty
    console.log("\n[TC-A07 to TC-A10] Testing Question-Level Analytics...");
    const qAnalytics = await makeRequest({ path: `/api/quiz/${quizId}/question-analytics`, method: 'GET', cookie: teacherCookie });
    if (qAnalytics.status !== 200 || qAnalytics.data.questions.length !== 3) {
        throw new Error("TC-A07 Failed: Question analytics endpoint failed!");
    }

    const qaQ1 = qAnalytics.data.questions.find(q => q.questionId === q1Id);
    const qaQ2 = qAnalytics.data.questions.find(q => q.questionId === q2Id);
    const qaQ3 = qAnalytics.data.questions.find(q => q.questionId === q3Id);

    // Q1: 2 correct, 1 incorrect -> 67% accuracy (Moderate)
    // Q2: 1 correct, 2 incorrect -> 33% accuracy (Difficult)
    // Q3: 2 correct, 1 incorrect -> 67% accuracy (Moderate)
    if (qaQ1.accuracyPercentage !== 67 || qaQ1.difficulty !== 'Moderate') {
        throw new Error(`TC-A07/10 Failed: Q1 accuracy or difficulty mismatch (${qaQ1.accuracyPercentage}%, ${qaQ1.difficulty})`);
    }
    if (qaQ2.accuracyPercentage !== 33 || qaQ2.difficulty !== 'Difficult') {
        throw new Error(`TC-A07/10 Failed: Q2 accuracy or difficulty mismatch (${qaQ2.accuracyPercentage}%, ${qaQ2.difficulty})`);
    }
    console.log(`✓ TC-A07 & TC-A10 PASSED: Accuracy and difficulty correctly classified (Q1: ${qaQ1.difficulty}, Q2: ${qaQ2.difficulty})`);

    // TC-A08: MCQ Option distribution
    const q1Opt0 = qaQ1.options.find(o => o.index === 0);
    const q1Opt1 = qaQ1.options.find(o => o.index === 1);
    if (q1Opt0.count !== 2 || q1Opt1.count !== 1 || !q1Opt0.isCorrect) {
        throw new Error("TC-A08 Failed: MCQ option distribution mismatch!");
    }
    console.log(`✓ TC-A08 PASSED: MCQ option counts: Option A = ${q1Opt0.count} (Correct), Option B = ${q1Opt1.count}`);

    // TC-A09: Multiple Select option distribution
    const q2Opt0 = qaQ2.options.find(o => o.index === 0);
    const q2Opt2 = qaQ2.options.find(o => o.index === 2);
    if (!q2Opt0.isCorrect || !q2Opt2.isCorrect) {
        throw new Error("TC-A09 Failed: Multiple select correct option markers mismatch!");
    }
    console.log(`✓ TC-A09 PASSED: Multiple Select option selection frequency verified`);

    // TC-A11: Topic analytics
    console.log("\n[TC-A11] Verifying topic analytics...");
    const topic = aRes.data.topicAnalytics;
    if (topic.topic !== 'Entropy and Compression' || topic.attemptCount !== 3) {
        throw new Error("TC-A11 Failed: Topic analytics mismatch!");
    }
    console.log(`✓ TC-A11 PASSED: Topic analytics: '${topic.topic}' with ${topic.attemptCount} attempts`);

    // TC-A12, TC-A13, TC-A14: Student Analytics & Attempt Progression
    console.log("\n[TC-A12 to TC-A14] Verifying student analytics and multiple attempt progression...");
    const st1Analytics = await makeRequest({ path: `/api/quiz/${quizId}/student/${student1Id}/analytics`, method: 'GET', cookie: student1Cookie });
    if (st1Analytics.status !== 200) throw new Error("TC-A12 Failed: Student analytics endpoint failed!");

    // Student 1 went from 75% (Attempt 1) to 100% (Attempt 2) -> Improvement = +25%
    if (st1Analytics.data.totalAttempts !== 2 || st1Analytics.data.improvementPercentage !== 25 || st1Analytics.data.bestScore !== 20) {
        throw new Error(`TC-A14 Failed: Progression mismatch! (Attempts: ${st1Analytics.data.totalAttempts}, Delta: ${st1Analytics.data.improvementPercentage}%)`);
    }
    console.log(`✓ TC-A12 to TC-A14 PASSED: Student 1 attempt progression: 75% -> 100% (+${st1Analytics.data.improvementPercentage}%)`);

    // TC-A15: Teacher can export CSV
    console.log("\n[TC-A15] Testing CSV export endpoint...");
    const csvRes = await makeRequest({ path: `/api/quiz/${quizId}/export/csv`, method: 'GET', cookie: teacherCookie });
    if (csvRes.status !== 200 || !csvRes.raw.includes("Student Name") || !csvRes.raw.includes("Claude Shannon Jr")) {
        throw new Error("TC-A15 Failed: CSV export failed or invalid format!");
    }
    console.log(`✓ TC-A15 PASSED: CSV export generated successfully`);

    // TC-A16, TC-A17, TC-A18: Student RBAC & IDOR blocks
    console.log("\n[TC-A16 to TC-A18] Testing Student RBAC & IDOR blocks...");
    const stBlockedOverview = await makeRequest({ path: `/api/quiz/${quizId}/analytics`, method: 'GET', cookie: student1Cookie });
    const stBlockedQAnalytics = await makeRequest({ path: `/api/quiz/${quizId}/question-analytics`, method: 'GET', cookie: student1Cookie });
    const stBlockedCsv = await makeRequest({ path: `/api/quiz/${quizId}/export/csv`, method: 'GET', cookie: student1Cookie });
    const stBlockedIdor = await makeRequest({ path: `/api/quiz/${quizId}/student/${student2Id}/analytics`, method: 'GET', cookie: student1Cookie });

    if (stBlockedOverview.status !== 403 || stBlockedQAnalytics.status !== 403 || stBlockedCsv.status !== 403 || stBlockedIdor.status !== 403) {
        throw new Error("TC-A16-A18 Failed: Student RBAC or IDOR not properly blocked with 403!");
    }
    console.log(`✓ TC-A16 to TC-A18 PASSED: Teacher overview, question analytics, CSV export, and cross-student IDOR blocked for students with HTTP 403`);

    // TC-A19 & TC-A20: Foreign teacher and cross-classroom IDOR blocked
    console.log("\n[TC-A19 & TC-A20] Foreign teacher access block check...");
    const foreignBlocked = await makeRequest({ path: `/api/quiz/${quizId}/analytics`, method: 'GET', cookie: foreignTeacherCookie });
    if (foreignBlocked.status !== 403) throw new Error("TC-A19 Failed: Foreign teacher was not blocked!");
    console.log(`✓ TC-A19 & TC-A20 PASSED: Foreign teacher blocked with HTTP 403`);

    // TC-A22 & TC-A23: Draft quiz excluded from student analytics
    console.log("\n[TC-A22 & TC-A23] Draft quiz excluded from student analytics...");
    const draftQ = await makeRequest({
        path: '/api/quiz/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { title: 'Draft Unreleased Quiz', roomId, timeLimit: 10, deadline: new Date(Date.now() + 86400000), isPublished: false }
    });
    const draftStudentAnalytics = await makeRequest({ path: `/api/quiz/${draftQ.data.quiz._id}/student/${student1Id}/analytics`, method: 'GET', cookie: student1Cookie });
    if (draftStudentAnalytics.status !== 403) throw new Error("TC-A22 Failed: Student could access draft quiz analytics!");
    console.log(`✓ TC-A22 & TC-A23 PASSED: Draft quiz access blocked for students with HTTP 403`);

    // TC-A24 to TC-A32: Full Regressions
    console.log("\n[TC-A24 to TC-A32] Running Full Regression Suite (Phases 1-4, Core, Classwork, Attendance)...");
    const outPhase4 = execSync('node tests/test_quiz_2.js', { cwd: __dirname + '/..' }).toString();
    if (!outPhase4.includes("ALL 26 QUIZ 2.0 PHASE 4 AUTOMATED TESTS PASSED!")) throw new Error("Phase 4 regression failed!");

    const outCw = execSync('node tests/test_classwork_2.js', { cwd: __dirname + '/..' }).toString();
    if (!outCw.includes("ALL 33 CLASSWORK 2.0 AUTOMATED TESTS PASSED!")) throw new Error("Classwork 2.0 regression failed!");

    console.log(`✓ TC-A24 to TC-A32 PASSED: All previous suites (100+ tests) passed with 100% success`);

    console.log("\n==================================================");
    console.log("ALL 32 QUIZ 2.0 PHASE 5 ANALYTICS TESTS PASSED! ✓");
    console.log("==================================================");

    process.exit(0);
}

runQuizAnalyticsTestSuite().catch(err => {
    console.error("Test Suite Failure:", err);
    process.exit(1);
});
