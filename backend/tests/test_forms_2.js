const http = require('http');
const { execSync } = require('child_process');
require('dotenv').config();

const API_HOST = '127.0.0.1';
const API_PORT = process.env.PORT || 3000;

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
                    resolve({ status: res.statusCode, data: parsed, cookie: tokenCookie });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data, cookie: tokenCookie });
                }
            });
        });

        req.on('error', err => reject(err));
        if (postData) req.write(postData);
        req.end();
    });
}

async function runFormsPhase2TestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS GOOGLE FORMS 1.0 PHASE 2 TEST SUITE");
    console.log("==================================================");

    const ts = Date.now();
    const teacherEmail = `forms_p2_t_${ts}@nexgen.com`;
    const foreignTeacherEmail = `forms_p2_ft_${ts}@nexgen.com`;
    const student1Email = `forms_p2_st1_${ts}@nexgen.com`;
    const student2Email = `forms_p2_st2_${ts}@nexgen.com`;

    // 0. Setup Users
    console.log("\n[SETUP] Creating test teachers and students...");
    const teacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Gauss', email: teacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherReg.cookie;
    const teacherId = teacherReg.data.user._id;

    const foreignTeacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Riemann', email: foreignTeacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherReg.cookie;

    const student1Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Euler Student', email: student1Email, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Reg.cookie;
    const student1Id = student1Reg.data.user._id;

    const student2Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Leibniz Student', email: student2Email, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Reg.cookie;
    const student2Id = student2Reg.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: `Forms P2 Classroom ${ts}`, section: 'Section P2', subject: 'Applied Analytics' }
    });
    if (roomRes.status !== 201) throw new Error("Failed to create room: " + JSON.stringify(roomRes.data));
    const roomId = roomRes.data.room._id;
    const roomCode = roomRes.data.room.code;

    // Students join classroom
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: roomCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: roomCode } });
    console.log(`✓ Classroom ready (${roomId}) with 2 enrolled students`);

    // Create Draft Form
    const createDraftRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Course Experience Questionnaire',
            description: 'Please evaluate your learning experience in this module.',
            roomId,
            topic: 'Evaluation',
            allowResponseEditing: true,
            limitOneResponse: true,
            collectEmail: true
        }
    });
    const draftFormId = createDraftRes.data.form._id;

    // Add Questions to Draft Form
    const questionsPayload = [
        {
            questionText: "What is your operating system?",
            type: "short_answer",
            required: true,
            order: 0
        },
        {
            questionText: "Detailed comments or suggestions:",
            type: "paragraph",
            required: false,
            order: 1
        },
        {
            questionText: "Rate the pace of the course:",
            type: "multiple_choice",
            options: [{ text: "Too Slow" }, { text: "Just Right" }, { text: "Too Fast" }],
            required: true,
            order: 2
        },
        {
            questionText: "Which topics did you enjoy?",
            type: "checkboxes",
            options: [{ text: "Linear Algebra" }, { text: "Calculus" }, { text: "Probability" }, { text: "Optimization" }],
            required: true,
            order: 3
        },
        {
            questionText: "Preferred lab format:",
            type: "dropdown",
            options: [{ text: "In-Person" }, { text: "Virtual" }, { text: "Hybrid" }],
            required: true,
            order: 4
        }
    ];

    const questionsSaveRes = await makeRequest({
        path: `/api/forms/${draftFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: questionsPayload }
    });
    const savedQuestions = questionsSaveRes.data.questions;
    const qShortId = savedQuestions[0]._id;
    const qParagraphId = savedQuestions[1]._id;
    const qMcqId = savedQuestions[2]._id;
    const qCheckId = savedQuestions[3]._id;
    const qDropId = savedQuestions[4]._id;

    // [F2-02] Student cannot retrieve draft
    console.log("\n[F2-02] Student cannot retrieve draft form...");
    const draftAccessRes = await makeRequest({
        path: `/api/forms/${draftFormId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (draftAccessRes.status !== 403) throw new Error("F2-02 Failed: Student accessed draft form");
    console.log(`✓ F2-02 PASSED: Draft form access blocked for student with HTTP 403`);

    // Publish Form
    console.log("\n[SETUP] Publishing form for student response testing...");
    const publishRes = await makeRequest({
        path: `/api/forms/${draftFormId}/publish`,
        method: 'POST',
        cookie: teacherCookie
    });
    if (publishRes.status !== 200 || publishRes.data.form.status !== 'published') {
        throw new Error("Failed to publish form");
    }
    const formId = draftFormId;

    // [F2-01] Student retrieves published form
    console.log("\n[F2-01] Student retrieves published form...");
    const pubAccessRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (pubAccessRes.status !== 200 || pubAccessRes.data.questions.length !== 5) {
        throw new Error("F2-01 Failed: Student could not access published form");
    }
    console.log(`✓ F2-01 PASSED: Student retrieved published form with 5 questions`);

    // [F2-04] Required question validation
    console.log("\n[F2-04] Required question validation (missing required short answer)...");
    const missingReqRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: qShortId, textAnswer: "" }, // empty required
                { questionId: qMcqId, selectedOption: "Just Right" },
                { questionId: qCheckId, selectedOptions: ["Linear Algebra"] },
                { questionId: qDropId, selectedOption: "Hybrid" }
            ]
        }
    });
    if (missingReqRes.status !== 400) throw new Error("F2-04 Failed: Missing required answer not rejected with 400");
    console.log(`✓ F2-04 PASSED: Missing required answer rejected with HTTP 400`);

    // [F2-05] Invalid MCQ option rejected
    console.log("\n[F2-05] Invalid MCQ option rejected...");
    const invalidMcqRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: qShortId, textAnswer: "macOS" },
                { questionId: qMcqId, selectedOption: "Non-Existent Option!" },
                { questionId: qCheckId, selectedOptions: ["Linear Algebra"] },
                { questionId: qDropId, selectedOption: "Hybrid" }
            ]
        }
    });
    if (invalidMcqRes.status !== 400) throw new Error("F2-05 Failed: Invalid MCQ option not rejected with 400");
    console.log(`✓ F2-05 PASSED: Invalid MCQ option rejected with HTTP 400`);

    // [F2-06] Invalid checkbox option rejected
    console.log("\n[F2-06] Invalid checkbox option rejected...");
    const invalidCheckRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: qShortId, textAnswer: "macOS" },
                { questionId: qMcqId, selectedOption: "Just Right" },
                { questionId: qCheckId, selectedOptions: ["Linear Algebra", "Astrology"] },
                { questionId: qDropId, selectedOption: "Hybrid" }
            ]
        }
    });
    if (invalidCheckRes.status !== 400) throw new Error("F2-06 Failed: Invalid checkbox option not rejected with 400");
    console.log(`✓ F2-06 PASSED: Invalid checkbox option rejected with HTTP 400`);

    // [F2-07] Invalid dropdown option rejected
    console.log("\n[F2-07] Invalid dropdown option rejected...");
    const invalidDropRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: qShortId, textAnswer: "macOS" },
                { questionId: qMcqId, selectedOption: "Just Right" },
                { questionId: qCheckId, selectedOptions: ["Linear Algebra"] },
                { questionId: qDropId, selectedOption: "Telepathic" }
            ]
        }
    });
    if (invalidDropRes.status !== 400) throw new Error("F2-07 Failed: Invalid dropdown option not rejected with 400");
    console.log(`✓ F2-07 PASSED: Invalid dropdown option rejected with HTTP 400`);

    // [F2-03 & F2-08] Student submits valid response
    console.log("\n[F2-03 & F2-08] Student 1 submits valid response...");
    const validStudentAnswers = [
        { questionId: qShortId, textAnswer: "Linux Ubuntu 24.04" },
        { questionId: qParagraphId, textAnswer: "Excellent pace and great assignments." },
        { questionId: qMcqId, selectedOption: "Just Right" },
        { questionId: qCheckId, selectedOptions: ["Linear Algebra", "Optimization"] },
        { questionId: qDropId, selectedOption: "Hybrid" }
    ];
    const submitRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: validStudentAnswers }
    });
    if (submitRes.status !== 201 || !submitRes.data.responseId) {
        throw new Error("F2-03 Failed: Valid response submission failed: " + JSON.stringify(submitRes.data));
    }
    const student1ResponseId = submitRes.data.responseId;
    console.log(`✓ F2-03 & F2-08 PASSED: Student 1 response recorded (ID: ${student1ResponseId})`);

    // [F2-09] Student retrieves own response
    console.log("\n[F2-09] Student 1 retrieves own response...");
    const myRespRes = await makeRequest({
        path: `/api/forms/${formId}/my-response`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (myRespRes.status !== 200 || !myRespRes.data.response || myRespRes.data.response._id !== student1ResponseId) {
        throw new Error("F2-09 Failed: Could not retrieve own response");
    }
    console.log(`✓ F2-09 PASSED: Student 1 retrieved own response successfully`);

    // [F2-10] Student cannot retrieve another student's response
    console.log("\n[F2-10] Student 2 cannot retrieve Student 1's response (IDOR)...");
    const idorRespRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (idorRespRes.status !== 403) throw new Error("F2-10 Failed: Cross-student response IDOR was not blocked with 403");
    console.log(`✓ F2-10 PASSED: Cross-student IDOR blocked with HTTP 403`);

    // [F2-11] limitOneResponse blocks duplicate submission
    console.log("\n[F2-11] limitOneResponse blocks duplicate submission...");
    const duplicateSubmitRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: validStudentAnswers }
    });
    if (duplicateSubmitRes.status !== 409) {
        throw new Error("F2-11 Failed: Duplicate submission was not rejected with 409 Conflict");
    }
    console.log(`✓ F2-11 PASSED: Duplicate submission rejected with HTTP 409 Conflict`);

    // [F2-13] Response editing enabled
    console.log("\n[F2-13] Response editing enabled (allowResponseEditing=true)...");
    const updatedAnswers = [
        { questionId: qShortId, textAnswer: "Arch Linux" },
        { questionId: qParagraphId, textAnswer: "Updated comments after reflection." },
        { questionId: qMcqId, selectedOption: "Too Fast" },
        { questionId: qCheckId, selectedOptions: ["Probability", "Optimization"] },
        { questionId: qDropId, selectedOption: "Virtual" }
    ];
    const editRespRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { answers: updatedAnswers }
    });
    if (editRespRes.status !== 200) throw new Error("F2-13 Failed: Response edit failed: " + JSON.stringify(editRespRes.data));
    console.log(`✓ F2-13 PASSED: Student 1 successfully edited their response`);

    // [F2-15] Student cannot edit another student's response
    console.log("\n[F2-15] Student 2 cannot edit Student 1's response (IDOR)...");
    const idorEditRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}`,
        method: 'PUT',
        cookie: student2Cookie,
        body: { answers: updatedAnswers }
    });
    if (idorEditRes.status !== 403) throw new Error("F2-15 Failed: Cross-student edit was not blocked with 403");
    console.log(`✓ F2-15 PASSED: Cross-student edit blocked with HTTP 403`);

    // [F2-14] Response editing disabled
    console.log("\n[F2-14] Response editing disabled (setting allowResponseEditing=false)...");
    await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'PUT',
        cookie: teacherCookie,
        body: { allowResponseEditing: false }
    });
    const disabledEditRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { answers: updatedAnswers }
    });
    if (disabledEditRes.status !== 403) throw new Error("F2-14 Failed: Editing when disabled was not blocked with 403");
    console.log(`✓ F2-14 PASSED: Editing when disabled blocked with HTTP 403`);

    // [F2-12] Multiple responses allowed when limitOneResponse=false
    console.log("\n[F2-12] Multiple responses allowed when limitOneResponse=false...");
    const multiFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Repeated Log Form',
            roomId,
            limitOneResponse: false,
            status: 'published'
        }
    });
    const multiFormId = multiFormRes.data.form._id;
    const multiQRes = await makeRequest({
        path: `/api/forms/${multiFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{ questionText: "Daily note:", type: "short_answer", required: true }]
        }
    });
    const multiQId = multiQRes.data.questions[0]._id;

    const sub1 = await makeRequest({
        path: `/api/forms/${multiFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [{ questionId: multiQId, textAnswer: "Submission 1" }] }
    });
    const sub2 = await makeRequest({
        path: `/api/forms/${multiFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [{ questionId: multiQId, textAnswer: "Submission 2" }] }
    });
    if (sub1.status !== 201 || sub2.status !== 201 || sub1.data.responseId === sub2.data.responseId) {
        throw new Error("F2-12 Failed: Multiple submissions not handled separately");
    }
    console.log(`✓ F2-12 PASSED: Multiple responses recorded separately (ID1: ${sub1.data.responseId}, ID2: ${sub2.data.responseId})`);

    // [F2-16] Closed form submission blocked
    console.log("\n[F2-16] Closed form submission blocked...");
    await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'PUT',
        cookie: teacherCookie,
        body: { status: 'closed' }
    });
    const closedSubRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: validStudentAnswers }
    });
    if (closedSubRes.status !== 400 && closedSubRes.status !== 403) {
        throw new Error("F2-16 Failed: Closed form submission was not blocked");
    }
    console.log(`✓ F2-16 PASSED: Closed form submission blocked with HTTP ${closedSubRes.status}`);

    // Reopen form
    await makeRequest({ path: `/api/forms/${formId}`, method: 'PUT', cookie: teacherCookie, body: { status: 'published' } });

    // [F2-17] Before startAt submission blocked
    console.log("\n[F2-17] Before startAt submission blocked...");
    const futureStart = new Date(Date.now() + 3600000).toISOString();
    await makeRequest({ path: `/api/forms/${formId}`, method: 'PUT', cookie: teacherCookie, body: { startAt: futureStart } });
    const earlySubRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: validStudentAnswers }
    });
    if (earlySubRes.status !== 400) throw new Error("F2-17 Failed: Early submission was not blocked with 400");
    console.log(`✓ F2-17 PASSED: Early submission before startAt blocked with HTTP 400`);

    // Reset startAt
    await makeRequest({ path: `/api/forms/${formId}`, method: 'PUT', cookie: teacherCookie, body: { startAt: null } });

    // [F2-18] After endAt submission blocked
    console.log("\n[F2-18] After endAt submission blocked...");
    const pastEnd = new Date(Date.now() - 3600000).toISOString();
    await makeRequest({ path: `/api/forms/${formId}`, method: 'PUT', cookie: teacherCookie, body: { endAt: pastEnd } });
    const lateSubRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: validStudentAnswers }
    });
    if (lateSubRes.status !== 400) throw new Error("F2-18 Failed: Late submission was not blocked with 400");
    console.log(`✓ F2-18 PASSED: Expired submission after endAt blocked with HTTP 400`);

    // Reset endAt and allow Student 2 to submit
    await makeRequest({ path: `/api/forms/${formId}`, method: 'PUT', cookie: teacherCookie, body: { endAt: null } });
    const student2SubRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: validStudentAnswers }
    });
    const student2ResponseId = student2SubRes.data.responseId;

    // [F2-19] Teacher retrieves response list
    console.log("\n[F2-19] Teacher retrieves response list...");
    const teacherResponsesRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (teacherResponsesRes.status !== 200 || teacherResponsesRes.data.totalResponses !== 2) {
        throw new Error("F2-19 Failed: Teacher could not retrieve responses list: " + JSON.stringify(teacherResponsesRes.data));
    }
    console.log(`✓ F2-19 PASSED: Teacher retrieved ${teacherResponsesRes.data.totalResponses} responses (Students: ${teacherResponsesRes.data.studentsResponded})`);

    // [F2-20] Student cannot retrieve response list
    console.log("\n[F2-20] Student cannot retrieve response list...");
    const studentResponsesRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentResponsesRes.status !== 403) throw new Error("F2-20 Failed: Student accessed teacher response list");
    console.log(`✓ F2-20 PASSED: Student response list access blocked with HTTP 403`);

    // [F2-21] Foreign teacher cannot retrieve response list
    console.log("\n[F2-21] Foreign teacher cannot retrieve response list...");
    const foreignTeacherResponsesRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'GET',
        cookie: foreignTeacherCookie
    });
    if (foreignTeacherResponsesRes.status !== 403) throw new Error("F2-21 Failed: Foreign teacher accessed response list");
    console.log(`✓ F2-21 PASSED: Foreign teacher blocked with HTTP 403`);

    // [F2-22] Teacher retrieves individual response detail
    console.log("\n[F2-22] Teacher retrieves individual response detail...");
    const indivRespRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (indivRespRes.status !== 200 || !indivRespRes.data.answers || indivRespRes.data.answers.length !== 5) {
        throw new Error("F2-22 Failed: Could not get individual response detail");
    }
    console.log(`✓ F2-22 PASSED: Teacher retrieved individual response detail with 5 question answers`);

    // [F2-23] Foreign teacher blocked from individual response
    console.log("\n[F2-23] Foreign teacher blocked from individual response...");
    const foreignIndivRes = await makeRequest({
        path: `/api/forms/${formId}/responses/${student1ResponseId}`,
        method: 'GET',
        cookie: foreignTeacherCookie
    });
    if (foreignIndivRes.status !== 403) throw new Error("F2-23 Failed: Foreign teacher accessed individual response");
    console.log(`✓ F2-23 PASSED: Foreign teacher blocked with HTTP 403`);

    // [F2-24] Participation status correct
    console.log("\n[F2-24] Verifying participation roster status...");
    const rosterRes = await makeRequest({
        path: `/api/forms/${formId}/response-status`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (rosterRes.status !== 200 || rosterRes.data.totalStudents !== 2 || rosterRes.data.respondedCount !== 2) {
        throw new Error("F2-24 Failed: Participation status mismatch: " + JSON.stringify(rosterRes.data));
    }
    console.log(`✓ F2-24 PASSED: Participation roster verified (Total: ${rosterRes.data.totalStudents}, Responded: ${rosterRes.data.respondedCount})`);

    // [F2-25] Form response notification generated
    console.log("\n[F2-25] Verifying teacher received submission notification...");
    const notifsRes = await makeRequest({
        path: '/api/notifications',
        method: 'GET',
        cookie: teacherCookie
    });
    const formNotifs = (notifsRes.data.notifications || []).filter(n => n.type === 'form_response_submitted');
    if (formNotifs.length === 0) {
        throw new Error("F2-25 Failed: No form_response_submitted notifications found for teacher");
    }
    console.log(`✓ F2-25 PASSED: Teacher received ${formNotifs.length} form_response_submitted notification(s)`);

    // [F2-26] Invalid Form ID -> 400
    console.log("\n[F2-26] Invalid Form ID returns 400...");
    const invalidFormIdRes = await makeRequest({
        path: '/api/forms/invalid-form-id-123/responses',
        method: 'GET',
        cookie: teacherCookie
    });
    if (invalidFormIdRes.status !== 400) throw new Error("F2-26 Failed: Invalid Form ID did not return 400");
    console.log(`✓ F2-26 PASSED: Invalid Form ID returns HTTP 400`);

    // [F2-27] Invalid Response ID -> 400
    console.log("\n[F2-27] Invalid Response ID returns 400...");
    const invalidRespIdRes = await makeRequest({
        path: `/api/forms/${formId}/responses/invalid-resp-id`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (invalidRespIdRes.status !== 400) throw new Error("F2-27 Failed: Invalid Response ID did not return 400");
    console.log(`✓ F2-27 PASSED: Invalid Response ID returns HTTP 400`);

    // [F2-28] Nonexistent response -> 404
    console.log("\n[F2-28] Nonexistent response returns 404...");
    const nonExistentRespRes = await makeRequest({
        path: `/api/forms/${formId}/responses/6a859d28c5dedc56aaad7999`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (nonExistentRespRes.status !== 404) throw new Error("F2-28 Failed: Nonexistent response did not return 404");
    console.log(`✓ F2-28 PASSED: Nonexistent response returns HTTP 404`);

    // [F2-29] Unauthenticated -> 401
    console.log("\n[F2-29] Unauthenticated request returns 401...");
    const unauthRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'GET'
    });
    if (unauthRes.status !== 401) throw new Error("F2-29 Failed: Unauthenticated request did not return 401");
    console.log(`✓ F2-29 PASSED: Unauthenticated request returns HTTP 401`);

    console.log("\n==================================================");
    console.log("ALL 29 GOOGLE FORMS 1.0 PHASE 2 TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runFormsPhase2TestSuite().catch(err => {
    console.error("Forms Phase 2 Test Suite Failure:", err);
    process.exit(1);
});
