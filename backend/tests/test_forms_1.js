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

async function runFormsPhase1TestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS GOOGLE FORMS 1.0 PHASE 1 TEST SUITE");
    console.log("==================================================");

    const ts = Date.now();
    const teacherEmail = `forms_teacher_${ts}@nexgen.com`;
    const foreignTeacherEmail = `forms_foreign_t_${ts}@nexgen.com`;
    const student1Email = `forms_student1_${ts}@nexgen.com`;

    // 0. Setup Users
    console.log("\n[SETUP] Creating test teacher, foreign teacher, and student...");
    const teacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Forms Expert', email: teacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherReg.cookie;
    const teacherId = teacherReg.data.user._id;

    const foreignTeacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Foreign Teacher', email: foreignTeacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherReg.cookie;

    const student1Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Sam Student', email: student1Email, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Reg.cookie;
    const student1Id = student1Reg.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: `Forms Test Lab ${ts}`, section: 'Form Section A', subject: 'Survey Methods' }
    });
    if (roomRes.status !== 201) throw new Error("Failed to create room: " + JSON.stringify(roomRes.data));
    const roomId = roomRes.data.room._id;
    const roomCode = roomRes.data.room.code;

    // Student joins classroom
    const joinRes = await makeRequest({
        path: '/api/rooms/join',
        method: 'POST',
        cookie: student1Cookie,
        body: { code: roomCode }
    });
    if (joinRes.status !== 200) throw new Error("Student failed to join room");
    console.log(`✓ Classroom ready (${roomId}) with teacher and enrolled student`);

    let formId = null;

    // [F1-01] Teacher creates form
    console.log("\n[F1-01] Teacher creates form in classroom...");
    const createRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Mid-Semester Course Feedback Form',
            description: 'Please give us your honest feedback regarding the course modules.',
            roomId,
            topic: 'Feedback',
            allowResponseEditing: true,
            limitOneResponse: true,
            collectEmail: true
        }
    });
    if (createRes.status !== 201 || !createRes.data.form || createRes.data.form.status !== 'draft') {
        throw new Error("F1-01 Failed: Could not create form - " + JSON.stringify(createRes.data));
    }
    formId = createRes.data.form._id;
    console.log(`✓ F1-01 PASSED: Form created with ID ${formId} (Status: ${createRes.data.form.status})`);

    // [F1-02] Empty title rejected
    console.log("\n[F1-02] Empty title rejected...");
    const emptyTitleRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: { title: '   ', roomId }
    });
    if (emptyTitleRes.status !== 400) throw new Error("F1-02 Failed: Empty title was not rejected with 400");
    console.log(`✓ F1-02 PASSED: Empty title rejected with HTTP 400`);

    // [F1-03] Student cannot create form
    console.log("\n[F1-03] Student cannot create form...");
    const studentCreateRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: student1Cookie,
        body: { title: 'Student Form', roomId }
    });
    if (studentCreateRes.status !== 403) throw new Error("F1-03 Failed: Student was allowed to create form");
    console.log(`✓ F1-03 PASSED: Student creation blocked with HTTP 403`);

    // [F1-04] Foreign teacher cannot create form in unowned classroom
    console.log("\n[F1-04] Foreign teacher cannot create form in unowned classroom...");
    const foreignCreateRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: foreignTeacherCookie,
        body: { title: 'Foreign Form', roomId }
    });
    if (foreignCreateRes.status !== 403) throw new Error("F1-04 Failed: Foreign teacher was allowed to create form");
    console.log(`✓ F1-04 PASSED: Foreign teacher blocked with HTTP 403`);

    // [F1-05] Teacher retrieves own form
    console.log("\n[F1-05] Teacher retrieves own form...");
    const teacherGetRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (teacherGetRes.status !== 200 || !teacherGetRes.data.form) {
        throw new Error("F1-05 Failed: Teacher could not retrieve form");
    }
    console.log(`✓ F1-05 PASSED: Teacher retrieved form "${teacherGetRes.data.form.title}"`);

    // [F1-06] Student cannot access draft form
    console.log("\n[F1-06] Student cannot access draft form...");
    const studentGetDraftRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentGetDraftRes.status !== 403) {
        throw new Error("F1-06 Failed: Student was able to access draft form");
    }
    console.log(`✓ F1-06 PASSED: Student blocked from draft form with HTTP 403`);

    // [F1-07] Foreign teacher cannot access classroom forms
    console.log("\n[F1-07] Foreign teacher cannot access classroom forms...");
    const foreignGetRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: foreignTeacherCookie
    });
    if (foreignGetRes.status !== 403) throw new Error("F1-07 Failed: Foreign teacher accessed form");
    console.log(`✓ F1-07 PASSED: Foreign teacher blocked with HTTP 403`);

    // [F1-08 to F1-12] Add all 5 supported question types
    console.log("\n[F1-08 to F1-12] Adding short_answer, paragraph, multiple_choice, checkboxes, dropdown questions...");
    const validQuestions = [
        {
            questionText: "What is your primary operating system?",
            description: "Used for lab development",
            type: "short_answer",
            required: true,
            order: 0
        },
        {
            questionText: "Please describe your experience with distributed computing.",
            description: "Paragraph summary",
            type: "paragraph",
            required: false,
            order: 1
        },
        {
            questionText: "Which frontend framework do you prefer?",
            description: "Select one",
            type: "multiple_choice",
            options: [{ text: "React" }, { text: "Vue" }, { text: "Svelte" }, { text: "Angular" }],
            required: true,
            order: 2
        },
        {
            questionText: "Which databases have you used in production?",
            description: "Select all that apply",
            type: "checkboxes",
            options: [{ text: "MongoDB" }, { text: "PostgreSQL" }, { text: "Redis" }, { text: "MySQL" }],
            required: false,
            order: 3
        },
        {
            questionText: "What is your current academic year?",
            description: "Select from dropdown",
            type: "dropdown",
            options: [{ text: "Freshman" }, { text: "Sophomore" }, { text: "Junior" }, { text: "Senior" }],
            required: true,
            order: 4
        }
    ];

    const saveQuestionsRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: validQuestions }
    });
    if (saveQuestionsRes.status !== 200 || saveQuestionsRes.data.count !== 5) {
        throw new Error("F1-08..12 Failed: Could not save 5 valid questions: " + JSON.stringify(saveQuestionsRes.data));
    }
    console.log(`✓ F1-08 to F1-12 PASSED: 5 Question types saved successfully (count = ${saveQuestionsRes.data.count})`);

    // [F1-13] Invalid question type rejected
    console.log("\n[F1-13] Invalid question type rejected...");
    const invalidTypeRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{ questionText: "Invalid Type Question", type: "unsupported_matrix_grid" }]
        }
    });
    if (invalidTypeRes.status !== 400) throw new Error("F1-13 Failed: Invalid question type not rejected with 400");
    console.log(`✓ F1-13 PASSED: Invalid question type rejected with HTTP 400`);

    // [F1-14] Empty question text rejected
    console.log("\n[F1-14] Empty question text rejected...");
    const emptyQTextRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{ questionText: "   ", type: "short_answer" }]
        }
    });
    if (emptyQTextRes.status !== 400) throw new Error("F1-14 Failed: Empty question text not rejected with 400");
    console.log(`✓ F1-14 PASSED: Empty question text rejected with HTTP 400`);

    // [F1-15] MCQ with insufficient options rejected
    console.log("\n[F1-15] MCQ with insufficient options rejected (<2 options)...");
    const mcqInsuffRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{ questionText: "Pick one", type: "multiple_choice", options: [{ text: "Only One Option" }] }]
        }
    });
    if (mcqInsuffRes.status !== 400) throw new Error("F1-15 Failed: MCQ with 1 option not rejected with 400");
    console.log(`✓ F1-15 PASSED: MCQ with <2 options rejected with HTTP 400`);

    // [F1-16] Checkbox with insufficient options rejected
    console.log("\n[F1-16] Checkbox with insufficient options rejected (<2 options)...");
    const checkInsuffRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{ questionText: "Pick any", type: "checkboxes", options: [{ text: "Solo Option" }] }]
        }
    });
    if (checkInsuffRes.status !== 400) throw new Error("F1-16 Failed: Checkboxes with 1 option not rejected with 400");
    console.log(`✓ F1-16 PASSED: Checkboxes with <2 options rejected with HTTP 400`);

    // [F1-17] Dropdown with insufficient options rejected
    console.log("\n[F1-17] Dropdown with insufficient options rejected (<2 options)...");
    const dropInsuffRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{ questionText: "Select one", type: "dropdown", options: [{ text: "Lonely Choice" }] }]
        }
    });
    if (dropInsuffRes.status !== 400) throw new Error("F1-17 Failed: Dropdown with 1 option not rejected with 400");
    console.log(`✓ F1-17 PASSED: Dropdown with <2 options rejected with HTTP 400`);

    // [F1-18] Question ordering persisted
    console.log("\n[F1-18] Verifying question ordering is persisted in database...");
    const getQuestionsRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (!getQuestionsRes.data.questions || getQuestionsRes.data.questions.length !== 5) {
        throw new Error("F1-18 Failed: Questions count mismatch");
    }
    const retrievedQ = getQuestionsRes.data.questions;
    for (let i = 0; i < retrievedQ.length; i++) {
        if (retrievedQ[i].order !== i) {
            throw new Error(`F1-18 Failed: Question at index ${i} has order ${retrievedQ[i].order}`);
        }
    }
    console.log(`✓ F1-18 PASSED: Question ordering 0..4 accurately persisted`);

    // [F1-19] Question duplication works
    console.log("\n[F1-19] Testing Question duplication...");
    const duplicatedQuestion = {
        ...validQuestions[2],
        questionText: validQuestions[2].questionText + " (Copy)",
        order: 5
    };
    const duplicateRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: [...validQuestions, duplicatedQuestion] }
    });
    if (duplicateRes.status !== 200 || duplicateRes.data.count !== 6) {
        throw new Error("F1-19 Failed: Question duplication failed");
    }
    console.log(`✓ F1-19 PASSED: Question duplication persisted (total questions: 6)`);

    // [F1-20] Question deletion works
    console.log("\n[F1-20] Testing Question deletion (removing duplicated question)...");
    const deleteQRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: validQuestions } // Back to 5
    });
    if (deleteQRes.status !== 200 || deleteQRes.data.count !== 5) {
        throw new Error("F1-20 Failed: Question deletion failed");
    }
    console.log(`✓ F1-20 PASSED: Question deleted successfully (total questions: 5)`);

    // [F1-21] Question reordering works
    console.log("\n[F1-21] Testing Question reordering (swap Q0 and Q1)...");
    const reorderedQuestions = [
        { ...validQuestions[1], order: 0 },
        { ...validQuestions[0], order: 1 },
        { ...validQuestions[2], order: 2 },
        { ...validQuestions[3], order: 3 },
        { ...validQuestions[4], order: 4 }
    ];
    const reorderRes = await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: reorderedQuestions }
    });
    if (reorderRes.status !== 200) throw new Error("F1-21 Failed: Question reorder failed");
    const checkReorder = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (checkReorder.data.questions[0].questionText !== validQuestions[1].questionText) {
        throw new Error("F1-21 Failed: Reordered question did not match at position 0");
    }
    console.log(`✓ F1-21 PASSED: Question reordering persisted and verified`);

    // [F1-22] Form update works
    console.log("\n[F1-22] Teacher updates form settings...");
    const startAt = new Date(Date.now() + 3600000).toISOString();
    const endAt = new Date(Date.now() + 86400000).toISOString();
    const updateRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'PUT',
        cookie: teacherCookie,
        body: {
            title: 'Updated Feedback Form Title',
            description: 'Updated description for survey.',
            topic: 'Surveys 2026',
            startAt,
            endAt,
            allowResponseEditing: false,
            limitOneResponse: true,
            collectEmail: false
        }
    });
    if (updateRes.status !== 200 || updateRes.data.form.title !== 'Updated Feedback Form Title') {
        throw new Error("F1-22 Failed: Form update failed: " + JSON.stringify(updateRes.data));
    }
    console.log(`✓ F1-22 PASSED: Form updated with new title, topic, dates, and response settings`);

    // [F1-23] Publish form (Lifecycle & Notification)
    console.log("\n[F1-23] Teacher publishes form...");
    const publishRes = await makeRequest({
        path: `/api/forms/${formId}/publish`,
        method: 'POST',
        cookie: teacherCookie
    });
    if (publishRes.status !== 200 || publishRes.data.form.status !== 'published') {
        throw new Error("F1-23 Failed: Publish form failed: " + JSON.stringify(publishRes.data));
    }
    console.log(`✓ F1-23a PASSED: Form published (Status: ${publishRes.data.form.status})`);

    // Verify student can now access published form
    const studentGetPublished = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentGetPublished.status !== 200 || !studentGetPublished.data.form) {
        throw new Error("F1-23 Failed: Student could not access published form");
    }
    console.log(`✓ F1-23b PASSED: Enrolled student can now view published form`);

    // [F1-24] Student cannot modify form
    console.log("\n[F1-24] Student cannot modify form...");
    const studentUpdateRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { title: 'Hacked by Student' }
    });
    if (studentUpdateRes.status !== 403) throw new Error("F1-24 Failed: Student was allowed to modify form");
    console.log(`✓ F1-24 PASSED: Student modification blocked with HTTP 403`);

    // [F1-25] Foreign teacher cannot modify form
    console.log("\n[F1-25] Foreign teacher cannot modify form...");
    const foreignUpdateRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'PUT',
        cookie: foreignTeacherCookie,
        body: { title: 'Hacked by Foreign Teacher' }
    });
    if (foreignUpdateRes.status !== 403) throw new Error("F1-25 Failed: Foreign teacher was allowed to modify form");
    console.log(`✓ F1-25 PASSED: Foreign teacher modification blocked with HTTP 403`);

    // [F1-26] Delete form & cleanup
    console.log("\n[F1-26] Teacher deletes form...");
    const deleteRes = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'DELETE',
        cookie: teacherCookie
    });
    if (deleteRes.status !== 200) throw new Error("F1-26 Failed: Form delete failed");
    
    const verifyDelete = await makeRequest({
        path: `/api/forms/${formId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (verifyDelete.status !== 404) throw new Error("F1-26 Failed: Deleted form still accessible");
    console.log(`✓ F1-26 PASSED: Form deleted and subsequent GET returns HTTP 404`);

    // [F1-27] Invalid Form ID
    console.log("\n[F1-27] Invalid Form ID returns 400...");
    const invalidIdRes = await makeRequest({
        path: '/api/forms/invalid-id-12345',
        method: 'GET',
        cookie: teacherCookie
    });
    if (invalidIdRes.status !== 400) throw new Error("F1-27 Failed: Invalid ID did not return 400");
    console.log(`✓ F1-27 PASSED: Invalid Form ID returns HTTP 400`);

    // [F1-28] Non-existent Form returns 404
    console.log("\n[F1-28] Non-existent Form returns 404...");
    const nonExistentRes = await makeRequest({
        path: '/api/forms/6a859d28c5dedc56aaad7999',
        method: 'GET',
        cookie: teacherCookie
    });
    if (nonExistentRes.status !== 404) throw new Error("F1-28 Failed: Non-existent form did not return 404");
    console.log(`✓ F1-28 PASSED: Non-existent Form returns HTTP 404`);

    // [F1-29] Unauthenticated requests return 401
    console.log("\n[F1-29] Unauthenticated requests return 401...");
    const unauthRes = await makeRequest({
        path: `/api/forms/room/${roomId}`,
        method: 'GET'
    });
    if (unauthRes.status !== 401) throw new Error("F1-29 Failed: Unauthenticated request did not return 401");
    console.log(`✓ F1-29 PASSED: Unauthenticated request rejected with HTTP 401`);

    console.log("\n==================================================");
    console.log("ALL 29 GOOGLE FORMS 1.0 PHASE 1 TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runFormsPhase1TestSuite().catch(err => {
    console.error("Forms Test Suite Failure:", err);
    process.exit(1);
});
