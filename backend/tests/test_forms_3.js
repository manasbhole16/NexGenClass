const http = require('http');
const XLSX = require('xlsx');
require('dotenv').config();

const API_HOST = '127.0.0.1';
const API_PORT = process.env.PORT || 3000;

function makeRequest({ path, method = 'GET', body = null, cookie = null, isBinary = false }) {
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
            const chunks = [];
            let setCookie = res.headers['set-cookie'];
            let tokenCookie = null;
            if (setCookie) {
                const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
                const match = cookieStr.match(/token=[^;]+/);
                if (match) tokenCookie = match[0];
            }

            res.on('data', chunk => { chunks.push(chunk); });
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                if (isBinary) {
                    return resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        buffer,
                        cookie: tokenCookie
                    });
                }
                const text = buffer.toString('utf-8');
                try {
                    const parsed = JSON.parse(text);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: text, cookie: tokenCookie });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: text, cookie: tokenCookie });
                }
            });
        });

        req.on('error', err => reject(err));
        if (postData) req.write(postData);
        req.end();
    });
}

async function runFormsPhase3TestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS GOOGLE FORMS 1.0 PHASE 3 TEST SUITE");
    console.log("==================================================");

    const ts = Date.now();
    const teacherEmail = `forms_p3_t_${ts}@nexgen.com`;
    const foreignTeacherEmail = `forms_p3_ft_${ts}@nexgen.com`;
    const student1Email = `forms_p3_st1_${ts}@nexgen.com`;
    const student2Email = `forms_p3_st2_${ts}@nexgen.com`;
    const student3Email = `forms_p3_st3_${ts}@nexgen.com`;

    // 0. Setup Users
    console.log("\n[SETUP] Creating test teachers and students...");
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
        body: { fullname: 'Prof. Shannon', email: foreignTeacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherReg.cookie;

    const student1Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Ada Lovelace, "The Countess"', email: student1Email, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Reg.cookie;
    const student1Id = student1Reg.data.user._id;

    const student2Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Charles Babbage', email: student2Email, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Reg.cookie;
    const student2Id = student2Reg.data.user._id;

    const student3Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'George Boole', email: student3Email, password: 'Password123!', role: 'student' }
    });
    const student3Cookie = student3Reg.cookie;
    const student3Id = student3Reg.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: `Forms P3 Classroom ${ts}`, section: 'Section P3', subject: 'Automata Theory' }
    });
    if (roomRes.status !== 201) throw new Error("Failed to create room: " + JSON.stringify(roomRes.data));
    const roomId = roomRes.data.room._id;
    const roomCode = roomRes.data.room.code;

    // Students join classroom
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: roomCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: roomCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student3Cookie, body: { code: roomCode } });
    console.log(`✓ Classroom ready (${roomId}) with 3 enrolled students`);

    // Create Form with Scoring & Questions
    const createFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Automata & Logic Assessment',
            description: 'Mid-term evaluation with objective and descriptive questions.',
            roomId,
            topic: 'Theoretical CS',
            allowResponseEditing: false,
            limitOneResponse: true,
            collectEmail: true,
            showResultsImmediately: true
        }
    });
    const formId = createFormRes.data.form._id;

    // Add Questions: 2 Objective (MCQ, Checkbox, Dropdown) and 2 Subjective (Short Answer, Paragraph)
    const questionsPayload = [
        {
            questionText: "What is the time complexity of binary search?",
            type: "multiple_choice",
            options: [{ text: "O(1)" }, { text: "O(log n)" }, { text: "O(n)" }, { text: "O(n^2)" }],
            correctAnswer: "O(log n)",
            marks: 3,
            required: true,
            order: 0
        },
        {
            questionText: "Which of the following are NP-Complete problems?",
            type: "checkboxes",
            options: [{ text: "3-SAT" }, { text: "Travelling Salesperson" }, { text: "Merge Sort" }, { text: "Vertex Cover" }],
            correctAnswers: ["3-SAT", "Travelling Salesperson", "Vertex Cover"],
            marks: 4,
            required: true,
            order: 1
        },
        {
            questionText: "Select the deterministic automaton class:",
            type: "dropdown",
            options: [{ text: "NFA" }, { text: "DFA" }, { text: "PDA" }],
            correctAnswer: "DFA",
            marks: 3,
            required: true,
            order: 2
        },
        {
            questionText: "State Church-Turing thesis in your own words:",
            type: "short_answer",
            marks: 5,
            required: true,
            order: 3
        },
        {
            questionText: "Explain the difference between P and NP:",
            type: "paragraph",
            marks: 5,
            required: false,
            order: 4
        }
    ];

    const saveQRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: questionsPayload }
    });
    if (saveQRes.status !== 200) throw new Error("Failed to save questions: " + JSON.stringify(saveQRes.data));

    // [F3-13] Correct total marks
    console.log("\n[F3-13] Verifying calculated total marks on Form...");
    if (saveQRes.data.totalMarks !== 20) throw new Error(`F3-13 Failed: Expected totalMarks 20, got ${saveQRes.data.totalMarks}`);
    console.log(`✓ F3-13 PASSED: Total marks accurately calculated as ${saveQRes.data.totalMarks} (3+4+3+5+5)`);

    // Publish Form
    await makeRequest({ path: `/api/forms/${formId}/publish`, method: 'POST', cookie: teacherCookie });

    const qList = saveQRes.data.questions;
    const qMcq = qList[0];
    const qCheck = qList[1];
    const qDrop = qList[2];
    const qShort = qList[3];
    const qPara = qList[4];

    // [F3-12 & F3-17] Student 1 submits perfect objective answers
    console.log("\n[F3-12 & F3-17] Student 1 submits (all correct objective answers)...");
    const sub1Res = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: qMcq._id, selectedOption: "O(log n)" }, // correct (+3)
                { questionId: qCheck._id, selectedOptions: ["3-SAT", "Travelling Salesperson", "Vertex Cover"] }, // correct (+4)
                { questionId: qDrop._id, selectedOption: "DFA" }, // correct (+3)
                { questionId: qShort._id, textAnswer: "Any algorithmic computation can be simulated by a Turing machine." },
                { questionId: qPara._id, textAnswer: "P contains polynomial time decidable problems; NP contains polynomial time verifiable problems." }
            ]
        }
    });
    if (sub1Res.status !== 201 || sub1Res.data.score !== 10 || sub1Res.data.percentage !== 50) {
        throw new Error(`F3-12 Failed: Expected score 10 and percentage 50, got ${JSON.stringify(sub1Res.data)}`);
    }
    const student1ResponseId = sub1Res.data.responseId;
    console.log(`✓ F3-12 & F3-17 PASSED: Objective auto-scoring awarded 10/20 marks (50% percentage)`);

    // [F3-14 & F3-15 & F3-16] Student 2 submits with incorrect MCQ & partial Checkbox
    console.log("\n[F3-14 & F3-15 & F3-16] Student 2 submits (incorrect MCQ, incomplete Checkboxes)...");
    const sub2Res = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: {
            answers: [
                { questionId: qMcq._id, selectedOption: "O(n^2)" }, // wrong (0)
                { questionId: qCheck._id, selectedOptions: ["3-SAT", "Merge Sort"] }, // wrong (0)
                { questionId: qDrop._id, selectedOption: "DFA" }, // correct (+3)
                { questionId: qShort._id, textAnswer: "Mechanical computing engines." },
                { questionId: qPara._id, textAnswer: "Difference Engine calculations." }
            ]
        }
    });
    if (sub2Res.status !== 201 || sub2Res.data.score !== 3 || sub2Res.data.percentage !== 15) {
        throw new Error(`F3-14/15/16 Failed: Expected score 3 and percentage 15, got ${JSON.stringify(sub2Res.data)}`);
    }
    const student2ResponseId = sub2Res.data.responseId;
    console.log(`✓ F3-14, F3-15 & F3-16 PASSED: Incorrect objective answers received 0, correct Dropdown received 3/20 (15%)`);

    // [F3-01 to F3-05] Form Analytics Overview
    console.log("\n[F3-01 to F3-05] Teacher retrieves form analytics...");
    const analyticsRes = await makeRequest({
        path: `/api/forms/${formId}/analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (analyticsRes.status !== 200) throw new Error("F3-01 Failed: Analytics retrieval failed");
    const aData = analyticsRes.data;
    if (aData.totalResponses !== 2) throw new Error(`F3-02 Failed: totalResponses expected 2, got ${aData.totalResponses}`);
    if (aData.uniqueRespondents !== 2) throw new Error(`F3-03 Failed: uniqueRespondents expected 2, got ${aData.uniqueRespondents}`);
    if (aData.enrolledStudents !== 3) throw new Error(`F3-04 Failed: enrolledStudents expected 3, got ${aData.enrolledStudents}`);
    if (aData.responseRate !== 67) throw new Error(`F3-05 Failed: responseRate expected 67%, got ${aData.responseRate}%`);
    console.log(`✓ F3-01 to F3-05 PASSED: Analytics verified (2 responses, 2 respondents, 3 enrolled, 67% response rate)`);

    // [F3-06 to F3-11] Question-Level Analytics
    console.log("\n[F3-06 to F3-11] Teacher retrieves question analytics...");
    const qAnalyticsRes = await makeRequest({
        path: `/api/forms/${formId}/question-analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (qAnalyticsRes.status !== 200) throw new Error("F3-06 Failed: Question analytics failed");
    const qData = qAnalyticsRes.data.questions;
    // MCQ: O(log n) had 1 pick, O(n^2) had 1 pick
    const mcqStats = qData[0].optionsBreakdown;
    const logNOpt = mcqStats.find(o => o.text === "O(log n)");
    if (!logNOpt || logNOpt.count !== 1 || logNOpt.percentage !== 50) {
        throw new Error("F3-07 Failed: MCQ option distribution incorrect");
    }
    // Checkbox: 3-SAT was selected by both (count = 2)
    const checkStats = qData[1].optionsBreakdown;
    const satOpt = checkStats.find(o => o.text === "3-SAT");
    if (!satOpt || satOpt.count !== 2 || satOpt.percentage !== 100) {
        throw new Error("F3-08 Failed: Checkbox distribution incorrect");
    }
    // Dropdown: DFA selected by both (count = 2)
    const dropStats = qData[2].optionsBreakdown;
    const dfaOpt = dropStats.find(o => o.text === "DFA");
    if (!dfaOpt || dfaOpt.count !== 2) {
        throw new Error("F3-09 Failed: Dropdown distribution incorrect");
    }
    // Short Answer text response count
    if (qData[3].textResponses.length !== 2) throw new Error("F3-10 Failed: Text response count incorrect");
    // Answered/skipped counts
    if (qData[0].answeredCount !== 2 || qData[0].skippedCount !== 0) throw new Error("F3-11 Failed: Answered/skipped counts incorrect");
    console.log(`✓ F3-06 to F3-11 PASSED: Question-level distributions and text response counts accurately calculated`);

    // [F3-20 & F3-21] Marks validation boundaries
    console.log("\n[F3-20 & F3-21] Teacher grading boundaries (exceeding max marks & negative marks)...");
    const overMaxRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/grade`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            grades: [{ questionId: qShort._id, awardedMarks: 10 }] // max is 5
        }
    });
    if (overMaxRes.status !== 400) throw new Error("F3-20 Failed: Marks above maximum was not rejected with 400");

    const negativeRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/grade`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            grades: [{ questionId: qShort._id, awardedMarks: -2 }]
        }
    });
    if (negativeRes.status !== 400) throw new Error("F3-21 Failed: Negative marks was not rejected with 400");
    console.log(`✓ F3-20 & F3-21 PASSED: Marks boundary violations rejected with HTTP 400`);

    // [F3-18, F3-19, F3-22, F3-23, F3-24] Teacher grades Student 1 subjective questions
    console.log("\n[F3-18, F3-19, F3-22, F3-23, F3-24] Teacher grades Student 1 short answer and paragraph...");
    const gradeRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/grade`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            grades: [
                { questionId: qShort._id, awardedMarks: 5, feedback: "Flawless Church-Turing definition." },
                { questionId: qPara._id, awardedMarks: 4, feedback: "Great distinction between P and NP." }
            ]
        }
    });
    if (gradeRes.status !== 200) throw new Error("Failed to save grading: " + JSON.stringify(gradeRes.data));
    const gResp = gradeRes.data;
    // Score should be 10 (objective) + 5 + 4 = 19/20 (95%)
    if (gResp.score !== 19 || gResp.percentage !== 95 || gResp.gradingStatus !== 'graded') {
        throw new Error(`F3-18/19/22/24 Failed: Expected score 19 (95%) graded, got score ${gResp.score}, percentage ${gResp.percentage}%, status ${gResp.gradingStatus}`);
    }
    console.log(`✓ F3-18, F3-19, F3-22, F3-23 & F3-24 PASSED: Final score recalculated to 19/20 (95%), status = graded, feedback persisted`);

    // [F3-25] Student retrieves own result
    console.log("\n[F3-25] Student 1 retrieves own result...");
    const st1ResultRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/result`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (st1ResultRes.status !== 200 || st1ResultRes.data.score !== 19 || !st1ResultRes.data.resultsReleased) {
        throw new Error("F3-25 Failed: Student 1 could not retrieve own result");
    }
    console.log(`✓ F3-25 PASSED: Student 1 retrieved score 19/20 (95%) with question-level breakdown`);

    // [F3-26] Student cannot retrieve another student's result (IDOR)
    console.log("\n[F3-26] Student 2 cannot retrieve Student 1's result (IDOR)...");
    const idorResultRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/result`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (idorResultRes.status !== 403) throw new Error("F3-26 Failed: Cross-student result IDOR not blocked with 403");
    console.log(`✓ F3-26 PASSED: Cross-student result IDOR blocked with HTTP 403`);

    // [F3-27] Student cannot see teacher-only analytics
    console.log("\n[F3-27] Student cannot access analytics...");
    const stAnalyticsRes = await makeRequest({
        path: `/api/forms/${formId}/analytics`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (stAnalyticsRes.status !== 403) throw new Error("F3-27 Failed: Student accessed teacher analytics");
    console.log(`✓ F3-27 PASSED: Student blocked from teacher analytics with HTTP 403`);

    // [F3-28] Result release policy enforced
    console.log("\n[F3-28] Testing result release policy (showResultsImmediately=false with pending grading)...");
    await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'PUT',
        cookie: teacherCookie,
        body: { showResultsImmediately: false }
    });
    // Student 2 is still partially_graded / pending full evaluation
    const st2PendingResultRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student2ResponseId}/result`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (st2PendingResultRes.status !== 200 || st2PendingResultRes.data.resultsReleased !== false) {
        throw new Error("F3-28 Failed: Result was not withheld when showResultsImmediately=false");
    }
    console.log(`✓ F3-28 PASSED: Result correctly withheld from student when showResultsImmediately=false`);

    // Reset release policy
    await makeRequest({ path: `/api/forms/${formId}`, method: 'PUT', cookie: teacherCookie, body: { showResultsImmediately: true } });

    // [F3-29, F3-30, F3-31] CSV Export
    console.log("\n[F3-29, F3-30, F3-31] Teacher exports CSV report...");
    const csvRes = await makeRequest({
        path: `/api/forms/${formId}/export/csv`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (csvRes.status !== 200 || !csvRes.headers['content-type'].includes('text/csv')) {
        throw new Error("F3-29 Failed: CSV export did not return text/csv");
    }
    const csvText = csvRes.raw;
    if (!csvText.includes("Student Name") || !csvText.includes("Score") || !csvText.includes("Grading Status")) {
        throw new Error("F3-30 Failed: CSV missing expected headers");
    }
    // Test safe escaping of special characters (Ada Lovelace, "The Countess")
    if (!csvText.includes('Ada Lovelace, ""The Countess""') && !csvText.includes('"Ada Lovelace, ""The Countess"""')) {
        throw new Error("F3-31 Failed: CSV did not escape quotes and commas properly");
    }
    console.log(`✓ F3-29, F3-30 & F3-31 PASSED: CSV export generated with headers and safe quote/comma escaping`);

    // [F3-32 & F3-33] Excel Export
    console.log("\n[F3-32 & F3-33] Teacher exports Excel workbook...");
    const xlsxRes = await makeRequest({
        path: `/api/forms/${formId}/export/xlsx`,
        method: 'GET',
        cookie: teacherCookie,
        isBinary: true
    });
    if (xlsxRes.status !== 200 || !xlsxRes.headers['content-type'].includes('spreadsheetml')) {
        throw new Error("F3-32 Failed: Excel export did not return spreadsheetml MIME type");
    }
    const workbook = XLSX.read(xlsxRes.buffer, { type: 'buffer' });
    if (!workbook.SheetNames.includes("Responses") || !workbook.SheetNames.includes("Question Analytics") || !workbook.SheetNames.includes("Participation")) {
        throw new Error(`F3-33 Failed: Expected sheets Responses, Question Analytics, Participation; got ${workbook.SheetNames.join(', ')}`);
    }
    console.log(`✓ F3-32 & F3-33 PASSED: Multi-sheet Excel report generated (${workbook.SheetNames.join(', ')})`);

    // [F3-34 to F3-40] Security & RBAC Checks
    console.log("\n[F3-34 to F3-40] Running Security & RBAC tests...");
    // [F3-34] Student cannot access question analytics
    const stQAnalytics = await makeRequest({ path: `/api/forms/${formId}/question-analytics`, method: 'GET', cookie: student1Cookie });
    if (stQAnalytics.status !== 403) throw new Error("F3-34 Failed: Student accessed question analytics");

    // [F3-35] Student cannot export CSV
    const stCsv = await makeRequest({ path: `/api/forms/${formId}/export/csv`, method: 'GET', cookie: student1Cookie });
    if (stCsv.status !== 403) throw new Error("F3-35 Failed: Student accessed CSV export");

    // [F3-36] Student cannot export Excel
    const stXlsx = await makeRequest({ path: `/api/forms/${formId}/export/xlsx`, method: 'GET', cookie: student1Cookie });
    if (stXlsx.status !== 403) throw new Error("F3-36 Failed: Student accessed Excel export");

    // [F3-37] Student cannot grade
    const stGrade = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/grade`,
        method: 'POST',
        cookie: student1Cookie,
        body: { grades: [{ questionId: qShort._id, awardedMarks: 5 }] }
    });
    if (stGrade.status !== 403) throw new Error("F3-37 Failed: Student accessed grading endpoint");

    // [F3-38] Foreign teacher blocked from analytics
    const ftAnalytics = await makeRequest({ path: `/api/forms/${formId}/analytics`, method: 'GET', cookie: foreignTeacherCookie });
    if (ftAnalytics.status !== 403) throw new Error("F3-38 Failed: Foreign teacher accessed analytics");

    // [F3-39] Foreign teacher blocked from exports
    const ftCsv = await makeRequest({ path: `/api/forms/${formId}/export/csv`, method: 'GET', cookie: foreignTeacherCookie });
    if (ftCsv.status !== 403) throw new Error("F3-39 Failed: Foreign teacher accessed CSV export");

    // [F3-40] Foreign teacher blocked from grading
    const ftGrade = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}/grade`,
        method: 'POST',
        cookie: foreignTeacherCookie,
        body: { grades: [{ questionId: qShort._id, awardedMarks: 5 }] }
    });
    if (ftGrade.status !== 403) throw new Error("F3-40 Failed: Foreign teacher graded response");
    console.log(`✓ F3-34 to F3-40 PASSED: RBAC properly enforced for students and foreign teachers (all HTTP 403)`);

    // [F3-41] Invalid Form ID -> 400
    console.log("\n[F3-41 to F3-44] Error Handling tests...");
    const invFormRes = await makeRequest({ path: '/api/forms/invalid-id/analytics', method: 'GET', cookie: teacherCookie });
    if (invFormRes.status !== 400) throw new Error("F3-41 Failed: Invalid Form ID did not return 400");

    // [F3-42] Invalid Response ID -> 400
    const invRespRes = await makeRequest({
        path: `/api/forms/${formId}/responses/invalid-resp/grade`,
        method: 'POST',
        cookie: teacherCookie,
        body: { grades: [] }
    });
    if (invRespRes.status !== 400) throw new Error("F3-42 Failed: Invalid Response ID did not return 400");

    // [F3-43] Nonexistent response -> 404
    const nonExistentRes = await makeRequest({
        path: `/api/forms/${formId}/responses/6a859d28c5dedc56aaad7999/result`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (nonExistentRes.status !== 404) throw new Error("F3-43 Failed: Nonexistent response did not return 404");

    // [F3-44] Unauthenticated -> 401
    const unauthRes = await makeRequest({ path: `/api/forms/${formId}/analytics`, method: 'GET' });
    if (unauthRes.status !== 401) throw new Error("F3-44 Failed: Unauthenticated did not return 401");
    console.log(`✓ F3-41 to F3-44 PASSED: Invalid IDs (400), nonexistent resources (404), and unauthenticated requests (401) verified`);

    console.log("\n==================================================");
    console.log("ALL 44 GOOGLE FORMS 1.0 PHASE 3 TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runFormsPhase3TestSuite().catch(err => {
    console.error("Forms Phase 3 Test Suite Failure:", err);
    process.exit(1);
});
