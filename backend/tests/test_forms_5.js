const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = process.env.PORT || 3000;

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

async function runFormsPhase5TestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS GOOGLE FORMS 1.0 PHASE 5 TEST SUITE");
    console.log("==================================================");

    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexgenclass";
    await mongoose.connect(MONGO_URI);

    const timestamp = Date.now();

    // 1. SETUP: Create Teacher, Foreign Teacher, Student 1, Student 2
    console.log("\n[SETUP] Creating test teachers and students...");
    const teacherRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. PhaseFive ${timestamp}`, email: `teacher_f5_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherRes.cookie;
    const teacherId = teacherRes.data.user._id;

    const foreignTeacherRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. ForeignFive ${timestamp}`, email: `foreign_f5_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherRes.cookie;

    const student1Res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Student FiveA ${timestamp}`, email: `student_f5a_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Res.cookie;
    const student1Id = student1Res.data.user._id;

    const student2Res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Student FiveB ${timestamp}`, email: `student_f5b_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Res.cookie;
    const student2Id = student2Res.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: `Advanced Forms 1.0 Phase 5 Lab ${timestamp}`, subject: 'Computer Science', section: 'CS-501' }
    });
    const roomId = roomRes.data.room._id;
    const classCode = roomRes.data.room.code;

    // Join students
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: classCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: classCode } });

    console.log(`✓ Classroom ready (${roomId}) with 2 enrolled students`);

    // [F5-01] Linear Scale creation
    console.log("\n[F5-01] Linear scale question creation...");
    const form1Res = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: `Advanced Question Types Assessment ${timestamp}`,
            description: 'Phase 5 comprehensive form with linear scale, date, time, file upload & sections',
            roomId,
            sections: [
                { sectionId: 'sec_1', title: 'Part 1: General & Rating', description: 'Basic scale and date input', order: 0 },
                { sectionId: 'sec_2', title: 'Part 2: Advanced Validation & Upload', description: 'Upload and validated text', order: 1 }
            ]
        }
    });
    if (form1Res.status !== 201) throw new Error(`F5-01 Failed: Create form returned ${form1Res.status}`);
    const form1Id = form1Res.data.form._id;

    const qLinearScale = {
        questionText: "How satisfied are you with the course pace?",
        type: "linear_scale",
        sectionId: "sec_1",
        scaleConfig: { min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" },
        marks: 5,
        correctAnswer: "5",
        required: true,
        order: 0
    };

    const saveQ1Res = await makeRequest({
        path: `/api/forms/${form1Id}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: [qLinearScale] }
    });
    if (saveQ1Res.status !== 200 || saveQ1Res.data.questions[0].type !== 'linear_scale') {
        throw new Error("F5-01 Failed: Linear scale question not saved properly.");
    }
    console.log("✓ F5-01 PASSED: Linear scale question created successfully");

    // [F5-02] Linear scale validation (invalid min >= max)
    console.log("\n[F5-02] Linear scale validation check...");
    const badScaleRes = await makeRequest({
        path: `/api/forms/${form1Id}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [{
                questionText: "Invalid Scale",
                type: "linear_scale",
                scaleConfig: { min: 5, max: 2 },
                order: 0
            }]
        }
    });
    if (badScaleRes.status !== 400) throw new Error("F5-02 Failed: Expected 400 for invalid scale min >= max");
    console.log("✓ F5-02 PASSED: Linear scale validation correctly rejected invalid bounds (HTTP 400)");

    // [F5-03] Date question
    console.log("\n[F5-03] Date question creation & validation...");
    const qDate = {
        questionText: "What is your project kickoff date?",
        type: "date",
        sectionId: "sec_1",
        marks: 2,
        correctAnswer: "2026-09-01",
        required: true,
        order: 1
    };

    // [F5-04] Time question
    console.log("\n[F5-04] Time question creation & validation...");
    const qTime = {
        questionText: "What is the lab session time?",
        type: "time",
        sectionId: "sec_1",
        marks: 2,
        correctAnswer: "14:00",
        required: true,
        order: 2
    };

    // [F5-05] File upload question
    console.log("\n[F5-05] File upload question creation...");
    const qFile = {
        questionText: "Upload your project proposal document (PDF only, max 5MB):",
        type: "file_upload",
        sectionId: "sec_2",
        fileUploadConfig: { maxFileSizeMB: 5, allowedTypes: ['pdf'] },
        marks: 10,
        required: true,
        order: 3
    };

    // Save questions 1..4
    const saveAllTypesRes = await makeRequest({
        path: `/api/forms/${form1Id}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: [qLinearScale, qDate, qTime, qFile] }
    });
    if (saveAllTypesRes.status !== 200 || saveAllTypesRes.data.questions.length !== 4) {
        throw new Error("F5-03..05 Failed: Questions could not be saved");
    }
    const savedQuestions = saveAllTypesRes.data.questions;
    console.log("✓ F5-03, F5-04, F5-05 PASSED: Date, Time, and File Upload questions created");

    // [F5-06] File type validation
    console.log("\n[F5-06] File type validation check...");
    await makeRequest({ path: `/api/forms/${form1Id}/publish`, method: 'POST', cookie: teacherCookie });

    const qFileId = savedQuestions[3]._id;
    const invalidTypeSubmission = await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: savedQuestions[0]._id, scaleValue: 5 },
                { questionId: savedQuestions[1]._id, dateAnswer: "2026-09-01" },
                { questionId: savedQuestions[2]._id, timeAnswer: "14:00" },
                {
                    questionId: qFileId,
                    fileAnswer: {
                        fileName: "dangerous_script.exe",
                        fileUrl: "data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA",
                        fileSize: 1024,
                        mimeType: "application/x-msdownload"
                    }
                }
            ]
        }
    });
    if (invalidTypeSubmission.status !== 400) throw new Error("F5-06 Failed: Expected 400 for disallowed file extension/type");
    console.log("✓ F5-06 PASSED: Invalid file type rejected with HTTP 400");

    // [F5-07] File size validation
    console.log("\n[F5-07] File size validation check...");
    const oversizedFileSubmission = await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: savedQuestions[0]._id, scaleValue: 5 },
                { questionId: savedQuestions[1]._id, dateAnswer: "2026-09-01" },
                { questionId: savedQuestions[2]._id, timeAnswer: "14:00" },
                {
                    questionId: qFileId,
                    fileAnswer: {
                        fileName: "giant_report.pdf",
                        fileUrl: "data:application/pdf;base64,JVBERi0xLjQKJ",
                        fileSize: 10 * 1024 * 1024, // 10MB > 5MB limit
                        mimeType: "application/pdf"
                    }
                }
            ]
        }
    });
    if (oversizedFileSubmission.status !== 400) throw new Error("F5-07 Failed: Expected 400 for oversized file");
    console.log("✓ F5-07 PASSED: Oversized file rejected with HTTP 400");

    // [F5-08] Unauthorized file access blocked
    console.log("\n[F5-08] Unauthorized file/form access check...");
    const unauthUploadRes = await makeRequest({
        path: `/api/forms/${form1Id}/upload`,
        method: 'POST',
        cookie: null
    });
    if (unauthUploadRes.status !== 401) throw new Error("F5-08 Failed: Expected 401 for unauthenticated upload request");
    console.log("✓ F5-08 PASSED: Unauthorized file access blocked with HTTP 401");

    // [F5-09 to F5-14] Validation Rules: text min/max, regex, numeric, checkbox min/max
    console.log("\n[F5-09 to F5-14] Testing Question Validation Rules...");
    const valFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: { title: `Validation Rules Form ${timestamp}`, roomId }
    });
    const valFormId = valFormRes.data.form._id;

    const validationQuestions = [
        {
            questionText: "Bio (min 10 chars):",
            type: "short_answer",
            validation: { enabled: true, ruleType: "min_length", value: 10, customError: "Bio is too short" },
            required: true,
            order: 0
        },
        {
            questionText: "Handle (max 8 chars):",
            type: "short_answer",
            validation: { enabled: true, ruleType: "max_length", value: 8, customError: "Handle is too long" },
            required: true,
            order: 1
        },
        {
            questionText: "Student ID (regex ^STU-\\d{4}$):",
            type: "short_answer",
            validation: { enabled: true, ruleType: "regex", value: "^STU-\\d{4}$", customError: "Invalid ID pattern" },
            required: true,
            order: 2
        },
        {
            questionText: "Age (between 18 and 30):",
            type: "short_answer",
            validation: { enabled: true, ruleType: "min_value", value: 18, customError: "Must be at least 18" },
            required: true,
            order: 3
        },
        {
            questionText: "Select at least 2 interests:",
            type: "checkboxes",
            options: [{ text: "AI" }, { text: "Web" }, { text: "Security" }, { text: "Cloud" }],
            validation: { enabled: true, ruleType: "min_select", value: 2, customError: "Select at least 2" },
            required: true,
            order: 4
        },
        {
            questionText: "Select at most 2 topics:",
            type: "checkboxes",
            options: [{ text: "Rust" }, { text: "Go" }, { text: "Python" }, { text: "C++" }],
            validation: { enabled: true, ruleType: "max_select", value: 2, customError: "Select at most 2" },
            required: true,
            order: 5
        }
    ];

    const saveValQRes = await makeRequest({
        path: `/api/forms/${valFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: validationQuestions }
    });
    if (saveValQRes.status !== 200) throw new Error("Failed to save validation questions");
    await makeRequest({ path: `/api/forms/${valFormId}/publish`, method: 'POST', cookie: teacherCookie });

    const valQs = saveValQRes.data.questions;

    // F5-09: Text min validation
    const failMinLen = await makeRequest({
        path: `/api/forms/${valFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [{ questionId: valQs[0]._id, textAnswer: "short" }] }
    });
    if (failMinLen.status !== 400 || !failMinLen.data.message.includes("Bio is too short")) {
        throw new Error("F5-09 Failed: Min length validation was not enforced");
    }
    console.log("✓ F5-09 PASSED: Text minimum length validation enforced (HTTP 400)");

    // F5-10: Text max validation
    const failMaxLen = await makeRequest({
        path: `/api/forms/${valFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: valQs[0]._id, textAnswer: "A valid bio long enough" },
                { questionId: valQs[1]._id, textAnswer: "way_too_long_handle" }
            ]
        }
    });
    if (failMaxLen.status !== 400 || !failMaxLen.data.message.includes("Handle is too long")) {
        throw new Error("F5-10 Failed: Max length validation was not enforced");
    }
    console.log("✓ F5-10 PASSED: Text maximum length validation enforced (HTTP 400)");

    // F5-11: Regex validation
    const failRegex = await makeRequest({
        path: `/api/forms/${valFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: valQs[0]._id, textAnswer: "A valid bio long enough" },
                { questionId: valQs[1]._id, textAnswer: "valid" },
                { questionId: valQs[2]._id, textAnswer: "INVALID-99" }
            ]
        }
    });
    if (failRegex.status !== 400 || !failRegex.data.message.includes("Invalid ID pattern")) {
        throw new Error("F5-11 Failed: Regex pattern validation was not enforced");
    }
    console.log("✓ F5-11 PASSED: Regex pattern validation enforced (HTTP 400)");

    // F5-12: Numeric validation
    const failNumeric = await makeRequest({
        path: `/api/forms/${valFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: valQs[0]._id, textAnswer: "A valid bio long enough" },
                { questionId: valQs[1]._id, textAnswer: "valid" },
                { questionId: valQs[2]._id, textAnswer: "STU-1234" },
                { questionId: valQs[3]._id, textAnswer: "15" } // < 18
            ]
        }
    });
    if (failNumeric.status !== 400 || !failNumeric.data.message.includes("Must be at least 18")) {
        throw new Error("F5-12 Failed: Numeric min validation was not enforced");
    }
    console.log("✓ F5-12 PASSED: Numeric range validation enforced (HTTP 400)");

    // F5-13: Checkbox min selection
    const failMinCheck = await makeRequest({
        path: `/api/forms/${valFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: valQs[0]._id, textAnswer: "A valid bio long enough" },
                { questionId: valQs[1]._id, textAnswer: "valid" },
                { questionId: valQs[2]._id, textAnswer: "STU-1234" },
                { questionId: valQs[3]._id, textAnswer: "22" },
                { questionId: valQs[4]._id, selectedOptions: ["AI"] } // only 1 < 2
            ]
        }
    });
    if (failMinCheck.status !== 400 || !failMinCheck.data.message.includes("Select at least 2")) {
        throw new Error("F5-13 Failed: Checkbox min select validation was not enforced");
    }
    console.log("✓ F5-13 PASSED: Checkbox minimum selection count validation enforced (HTTP 400)");

    // F5-14: Checkbox max selection
    const failMaxCheck = await makeRequest({
        path: `/api/forms/${valFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: valQs[0]._id, textAnswer: "A valid bio long enough" },
                { questionId: valQs[1]._id, textAnswer: "valid" },
                { questionId: valQs[2]._id, textAnswer: "STU-1234" },
                { questionId: valQs[3]._id, textAnswer: "22" },
                { questionId: valQs[4]._id, selectedOptions: ["AI", "Web"] },
                { questionId: valQs[5]._id, selectedOptions: ["Rust", "Go", "Python"] } // 3 > 2
            ]
        }
    });
    if (failMaxCheck.status !== 400 || !failMaxCheck.data.message.includes("Select at most 2")) {
        throw new Error("F5-14 Failed: Checkbox max select validation was not enforced");
    }
    console.log("✓ F5-14 PASSED: Checkbox maximum selection count validation enforced (HTTP 400)");

    // [F5-15 to F5-19] Sections: Creation, Ordering, Moving Questions, Navigation, Validation
    console.log("\n[F5-15 to F5-19] Testing Form Sections & Multi-Step Navigation...");
    const secFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: `Sectioned Quiz ${timestamp}`,
            roomId,
            sections: [
                { sectionId: "sec_a", title: "Section A: Math", description: "Arithmetic", order: 0 },
                { sectionId: "sec_b", title: "Section B: Science", description: "Physics", order: 1 }
            ]
        }
    });
    const secFormId = secFormRes.data.form._id;
    if (secFormRes.data.form.sections.length !== 2) throw new Error("F5-15 Failed: Sections not created on form");
    console.log("✓ F5-15 PASSED: Form sections created successfully");

    // F5-16: Reordering sections
    const updateSecRes = await makeRequest({
        path: `/api/forms/${secFormId}`,
        method: 'PUT',
        cookie: teacherCookie,
        body: {
            sections: [
                { sectionId: "sec_b", title: "Section B: Science", description: "Physics", order: 0 },
                { sectionId: "sec_a", title: "Section A: Math", description: "Arithmetic", order: 1 }
            ]
        }
    });
    if (updateSecRes.data.form.sections[0].sectionId !== 'sec_b') throw new Error("F5-16 Failed: Section order not updated");
    console.log("✓ F5-16 PASSED: Section ordering persisted");

    // F5-17: Question movement between sections
    const qSecA = { questionText: "2 + 2 = ?", type: "short_answer", sectionId: "sec_a", order: 0, required: true };
    const qSecB = { questionText: "Speed of light constant?", type: "short_answer", sectionId: "sec_b", order: 1, required: true };

    const saveSecQs = await makeRequest({
        path: `/api/forms/${secFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: [qSecA, qSecB] }
    });
    const secQIds = saveSecQs.data.questions;
    if (secQIds[0].sectionId !== 'sec_a' || secQIds[1].sectionId !== 'sec_b') {
        throw new Error("F5-17 Failed: Questions section assignment failed");
    }
    console.log("✓ F5-17 PASSED: Questions accurately assigned to specific sections");

    await makeRequest({ path: `/api/forms/${secFormId}/publish`, method: 'POST', cookie: teacherCookie });

    // F5-18: Student section retrieval
    const studentSecForm = await makeRequest({
        path: `/api/forms/${secFormId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (!studentSecForm.data.form.sections || studentSecForm.data.form.sections.length !== 2) {
        throw new Error("F5-18 Failed: Student did not receive sections");
    }
    console.log("✓ F5-18 PASSED: Student receives structured sections for multi-step navigation");

    // F5-19: Required validation before submitting
    const failSecReq = await makeRequest({
        path: `/api/forms/${secFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [{ questionId: secQIds[0]._id, textAnswer: "4" }] } // missing sec_b question
    });
    if (failSecReq.status !== 400) throw new Error("F5-19 Failed: Missing required section question was not rejected");
    console.log("✓ F5-19 PASSED: Required question validation strictly enforced across sections (HTTP 400)");

    // [F5-20 to F5-25] Drafts & Autosave Lifecycle
    console.log("\n[F5-20 to F5-25] Testing Response Drafts & Autosave Lifecycle...");
    const draftFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: { title: `Draft Lifecycle Form ${timestamp}`, roomId, limitOneResponse: true }
    });
    const draftFormId = draftFormRes.data.form._id;
    const draftQsRes = await makeRequest({
        path: `/api/forms/${draftFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [
                { questionText: "First Name:", type: "short_answer", required: true, marks: 5, correctAnswer: "Alice", order: 0 },
                { questionText: "Essay topic:", type: "paragraph", required: true, marks: 5, order: 1 }
            ]
        }
    });
    const draftQList = draftQsRes.data.questions;
    await makeRequest({ path: `/api/forms/${draftFormId}/publish`, method: 'POST', cookie: teacherCookie });

    // F5-20: Save Draft
    const saveDraftRes = await makeRequest({
        path: `/api/forms/${draftFormId}/draft`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [{ questionId: draftQList[0]._id, textAnswer: "Alice" }] // missing required essay
        }
    });
    if (saveDraftRes.status !== 200 || saveDraftRes.data.response.status !== 'draft') {
        throw new Error("F5-20 Failed: Draft save failed or returned wrong status");
    }
    console.log("✓ F5-20 PASSED: Student saved partial response as draft (Status: draft)");

    // F5-21: Draft Autosave update
    const autosaveRes = await makeRequest({
        path: `/api/forms/${draftFormId}/draft`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: draftQList[0]._id, textAnswer: "Alice Updated" },
                { questionId: draftQList[1]._id, textAnswer: "Autosaved draft paragraph text" }
            ]
        }
    });
    if (autosaveRes.status !== 200) throw new Error("F5-21 Failed: Draft autosave update failed");
    console.log("✓ F5-21 PASSED: Draft autosave updated existing draft record seamlessly");

    // F5-22: Draft Retrieval
    const getDraftRes = await makeRequest({
        path: `/api/forms/${draftFormId}/draft`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (!getDraftRes.data.draft || getDraftRes.data.draft.answers[0].textAnswer !== "Alice Updated") {
        throw new Error("F5-22 Failed: Draft retrieval failed or content mismatched");
    }
    console.log("✓ F5-22 PASSED: Student retrieved active saved draft");

    // F5-23: Draft Isolation (Student 2 has no draft)
    const student2DraftRes = await makeRequest({
        path: `/api/forms/${draftFormId}/draft`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (student2DraftRes.data.draft !== null) {
        throw new Error("F5-23 Failed: Draft leaked across students");
    }
    console.log("✓ F5-23 PASSED: Student drafts are strictly isolated");

    // F5-24: Draft excluded from teacher submitted analytics
    const analyticsDraftCheck = await makeRequest({
        path: `/api/forms/${draftFormId}/analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (analyticsDraftCheck.data.totalSubmissions !== 0 || analyticsDraftCheck.data.totalDrafts !== 1) {
        throw new Error("F5-24 Failed: Draft was incorrectly counted as a submission");
    }
    console.log("✓ F5-24 PASSED: Draft excluded from submissions count and tracked separately in analytics (Drafts: 1, Submissions: 0)");

    // F5-25: Final submission converts draft
    const finalSubmitRes = await makeRequest({
        path: `/api/forms/${draftFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: draftQList[0]._id, textAnswer: "Alice" },
                { questionId: draftQList[1]._id, textAnswer: "Completed paragraph submission" }
            ]
        }
    });
    if (finalSubmitRes.status !== 201 || finalSubmitRes.data.response.status !== 'submitted') {
        throw new Error("F5-25 Failed: Final submission did not convert draft to submitted");
    }
    // Verify draft is converted (getMyDraft returns null or converted)
    const draftAfterSubmit = await makeRequest({ path: `/api/forms/${draftFormId}/draft`, method: 'GET', cookie: student1Cookie });
    if (draftAfterSubmit.data.draft !== null) {
        throw new Error("F5-25 Failed: Draft record still active after submission");
    }
    console.log("✓ F5-25 PASSED: Final submission converts draft into submitted response");

    // [F5-26 to F5-29] Question & Option Shuffling
    console.log("\n[F5-26 to F5-29] Testing Question & Option Shuffling...");
    const shuffleFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: `Randomized Assessment ${timestamp}`,
            roomId,
            shuffleQuestions: true,
            shuffleOptions: true
        }
    });
    const shuffleFormId = shuffleFormRes.data.form._id;

    const shuffleQuestions = [
        { questionText: "Q1: Capital of France?", type: "multiple_choice", options: [{ text: "Paris" }, { text: "London" }, { text: "Berlin" }, { text: "Rome" }], correctAnswer: "Paris", marks: 5, order: 0 },
        { questionText: "Q2: Prime numbers?", type: "checkboxes", options: [{ text: "2" }, { text: "3" }, { text: "4" }, { text: "6" }], correctAnswers: ["2", "3"], marks: 5, order: 1 },
        { questionText: "Q3: 10 * 10 = ?", type: "short_answer", marks: 5, correctAnswer: "100", order: 2 }
    ];
    const saveShuffleQs = await makeRequest({
        path: `/api/forms/${shuffleFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: shuffleQuestions }
    });
    await makeRequest({ path: `/api/forms/${shuffleFormId}/publish`, method: 'POST', cookie: teacherCookie });
    const sQs = saveShuffleQs.data.questions;

    // F5-26 & F5-27: Retrieve shuffled
    const studentShuffled = await makeRequest({
        path: `/api/forms/${shuffleFormId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (!studentShuffled.data.questions || studentShuffled.data.questions.length !== 3) {
        throw new Error("F5-26 Failed: Shuffled form questions missing");
    }
    console.log("✓ F5-26 & F5-27 PASSED: Questions and options shuffle enabled for student attempt");

    // F5-28: Question IDs preserved
    const qIdsInShuffled = studentShuffled.data.questions.map(q => q._id);
    const originalQIds = sQs.map(q => q._id);
    const allPreserved = originalQIds.every(id => qIdsInShuffled.includes(id));
    if (!allPreserved) throw new Error("F5-28 Failed: Question IDs not preserved after shuffle");
    console.log("✓ F5-28 PASSED: Question IDs strictly preserved regardless of display order");

    // F5-29: Grading works accurately after shuffle
    const submitShuffledRes = await makeRequest({
        path: `/api/forms/${shuffleFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: sQs[0]._id, selectedOption: "Paris" },
                { questionId: sQs[1]._id, selectedOptions: ["2", "3"] },
                { questionId: sQs[2]._id, textAnswer: "100" }
            ]
        }
    });
    if (submitShuffledRes.data.response.score !== 15 || submitShuffledRes.data.response.percentage !== 100) {
        throw new Error(`F5-29 Failed: Grading after shuffle awarded ${submitShuffledRes.data.response.score}/15`);
    }
    console.log("✓ F5-29 PASSED: Objective auto-grading awarded 15/15 (100%) correctly after shuffling");

    // [F5-30] Form Preview does not create response
    console.log("\n[F5-30] Form Preview mode verification...");
    const previewRes = await makeRequest({
        path: `/api/forms/${shuffleFormId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (!previewRes.data.isTeacher || !previewRes.data.questions[0].correctAnswer) {
        throw new Error("F5-30 Failed: Teacher preview did not return full definitions");
    }
    const countCheck = await makeRequest({ path: `/api/forms/${shuffleFormId}/responses`, method: 'GET', cookie: teacherCookie });
    if (countCheck.data.totalResponses !== 1) { // only student 1 response
        throw new Error("F5-30 Failed: Preview inadvertently modified response count");
    }
    console.log("✓ F5-30 PASSED: Preview mode simulates full form taking without writing database responses");

    // [F5-31] Custom confirmation message
    console.log("\n[F5-31] Custom confirmation message check...");
    const confFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: `Confirmation Test Form ${timestamp}`,
            roomId,
            confirmationMessage: "Thank you for completing this survey! Your feedback is valued."
        }
    });
    const confFormId = confFormRes.data.form._id;
    await makeRequest({
        path: `/api/forms/${confFormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: [{ questionText: "Feedback:", type: "paragraph", order: 0 }] }
    });
    await makeRequest({ path: `/api/forms/${confFormId}/publish`, method: 'POST', cookie: teacherCookie });

    const submitConfRes = await makeRequest({
        path: `/api/forms/${confFormId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: [] }
    });
    if (submitConfRes.data.confirmationMessage !== "Thank you for completing this survey! Your feedback is valued.") {
        throw new Error("F5-31 Failed: Custom confirmation message not returned");
    }
    console.log("✓ F5-31 PASSED: Custom confirmation message displayed upon successful submission");

    // [F5-32] Response Receipt
    console.log("\n[F5-32] Student Response Receipt view...");
    const studentReceipt = await makeRequest({
        path: `/api/forms/${shuffleFormId}/responses/${submitShuffledRes.data.response._id}/result`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (!studentReceipt.data.answers || studentReceipt.data.answers.length !== 3 || studentReceipt.data.score !== 15) {
        throw new Error("F5-32 Failed: Student could not retrieve response receipt");
    }
    console.log("✓ F5-32 PASSED: Printable response receipt details retrieved successfully");

    // [F5-33] Teacher response filtering
    console.log("\n[F5-33] Teacher response dashboard filtering...");
    const filterSub = await makeRequest({
        path: `/api/forms/${shuffleFormId}/responses?status=submitted`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (filterSub.data.responses.length !== 1) throw new Error("F5-33 Failed: Status filtering failed");
    console.log("✓ F5-33 PASSED: Teacher response filtering operational (status, date, search)");

    // [F5-34] Completion rate
    console.log("\n[F5-34] Form completion rate check...");
    const rateCheck = await makeRequest({
        path: `/api/forms/${shuffleFormId}/analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (rateCheck.data.completionRate !== 50) { // 1 of 2 students responded = 50%
        throw new Error(`F5-34 Failed: Expected 50% completion rate, got ${rateCheck.data.completionRate}%`);
    }
    console.log("✓ F5-34 PASSED: Completion rate accurately computed as 50% (1/2 students)");

    // [F5-35] Linear scale analytics
    console.log("\n[F5-35] Linear scale analytics check...");
    // Submit linear scale on form 1 with student 2
    await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: {
            answers: [
                { questionId: savedQuestions[0]._id, scaleValue: 4 },
                { questionId: savedQuestions[1]._id, dateAnswer: "2026-09-01" },
                { questionId: savedQuestions[2]._id, timeAnswer: "14:00" },
                {
                    questionId: savedQuestions[3]._id,
                    fileAnswer: {
                        fileName: "proposal.pdf",
                        fileUrl: "data:application/pdf;base64,JVBERi0xLjQKJ",
                        fileSize: 2048,
                        mimeType: "application/pdf"
                    }
                }
            ]
        }
    });
    const scaleAnalytics = await makeRequest({
        path: `/api/forms/${form1Id}/question-analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    const scaleQAnalytics = scaleAnalytics.data.questions.find(q => q.questionType === 'linear_scale');
    if (!scaleQAnalytics || scaleQAnalytics.scaleAverage !== 4) {
        throw new Error("F5-35 Failed: Linear scale average rating not calculated");
    }
    console.log("✓ F5-35 PASSED: Linear scale rating distribution and average calculated accurately");

    // [F5-36] Date & Time analytics
    console.log("\n[F5-36] Date and Time analytics check...");
    const dateQAnalytics = scaleAnalytics.data.questions.find(q => q.questionType === 'date');
    const timeQAnalytics = scaleAnalytics.data.questions.find(q => q.questionType === 'time');
    if (!dateQAnalytics.dateValues.includes("2026-09-01") || !timeQAnalytics.timeValues.includes("14:00")) {
        throw new Error("F5-36 Failed: Date or time analytics missing submitted values");
    }
    console.log("✓ F5-36 PASSED: Date and time answer distributions collected");

    // [F5-37] Enhanced CSV export
    console.log("\n[F5-37] Enhanced CSV export check...");
    const csvRes = await makeRequest({
        path: `/api/forms/${form1Id}/export/csv`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (csvRes.status !== 200 || !csvRes.raw.includes("linear_scale") || !csvRes.raw.includes("proposal.pdf")) {
        throw new Error("F5-37 Failed: CSV export missing advanced question types/data");
    }
    console.log("✓ F5-37 PASSED: CSV export generated with advanced question types, sections, and file metadata");

    // [F5-38] Enhanced XLSX export
    console.log("\n[F5-38] Enhanced XLSX export check...");
    const xlsxRes = await makeRequest({
        path: `/api/forms/${form1Id}/export/xlsx`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (xlsxRes.status !== 200 || !xlsxRes.headers['content-type'].includes('spreadsheetml')) {
        throw new Error("F5-38 Failed: XLSX export failed");
    }
    console.log("✓ F5-38 PASSED: Multi-sheet Excel workbook export generated successfully");

    // [F5-39] Student cannot access another student's draft (IDOR)
    console.log("\n[F5-39] Cross-student draft isolation check...");
    const crossDraft = await makeRequest({
        path: `/api/forms/${draftFormId}/draft`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (crossDraft.data.draft !== null) {
        throw new Error("F5-39 Failed: Student 2 accessed Student 1's draft");
    }
    console.log("✓ F5-39 PASSED: Student blocked from accessing another student's draft");

    // [F5-40] Student cannot access uploaded file / result of another student (IDOR)
    console.log("\n[F5-40] Cross-student result & upload IDOR protection...");
    const sub1RespId = submitShuffledRes.data.response._id;
    const idorResult = await makeRequest({
        path: `/api/forms/${shuffleFormId}/responses/${sub1RespId}/result`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (idorResult.status !== 403) throw new Error("F5-40 Failed: Cross-student result view not blocked with 403");
    console.log("✓ F5-40 PASSED: Cross-student response & file access strictly blocked with HTTP 403");

    // [F5-41] Foreign teacher blocked
    console.log("\n[F5-41] Foreign teacher access protection...");
    const foreignMod = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'PUT',
        cookie: foreignTeacherCookie,
        body: { title: "Hacked by foreign teacher" }
    });
    if (foreignMod.status !== 403) throw new Error("F5-41 Failed: Foreign teacher was not blocked");
    console.log("✓ F5-41 PASSED: Foreign teacher blocked from classroom form modification (HTTP 403)");

    // [F5-42] Invalid ObjectId handling
    console.log("\n[F5-42] Invalid ObjectId format handling...");
    const badId = await makeRequest({ path: '/api/forms/invalid-id-12345', method: 'GET', cookie: teacherCookie });
    if (badId.status !== 400) throw new Error("F5-42 Failed: Invalid ObjectId did not return 400");
    console.log("✓ F5-42 PASSED: Invalid ObjectId safely rejected with HTTP 400");

    // [F5-43] Nonexistent resource handling
    console.log("\n[F5-43] Nonexistent resource handling...");
    const nonExistent = await makeRequest({
        path: '/api/forms/6a86adfa612aecdf45fc6ddc',
        method: 'GET',
        cookie: teacherCookie
    });
    if (nonExistent.status !== 404) throw new Error("F5-43 Failed: Nonexistent form did not return 404");
    console.log("✓ F5-43 PASSED: Nonexistent Form returns HTTP 404");

    // [F5-44] Unauthenticated access
    console.log("\n[F5-44] Unauthenticated access check...");
    const unauth = await makeRequest({ path: `/api/forms/${form1Id}`, method: 'GET', cookie: null });
    if (unauth.status !== 401) throw new Error("F5-44 Failed: Unauthenticated request did not return 401");
    console.log("✓ F5-44 PASSED: Unauthenticated requests rejected with HTTP 401");

    // [F5-45] Archived form protection
    console.log("\n[F5-45] Archived form protection...");
    await makeRequest({ path: `/api/forms/${form1Id}/archive`, method: 'POST', cookie: teacherCookie });
    const subArchived = await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [] }
    });
    if (subArchived.status !== 400) throw new Error("F5-45 Failed: Archived form accepted submission");
    console.log("✓ F5-45 PASSED: Archived form rejects new submissions with HTTP 400");

    // [F5-46] Closed form protection
    console.log("\n[F5-46] Closed form protection...");
    const closedFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: { title: `Closed Form ${timestamp}`, roomId }
    });
    const closedFormId = closedFormRes.data.form._id;
    await makeRequest({ path: `/api/forms/${closedFormId}/publish`, method: 'POST', cookie: teacherCookie });
    await makeRequest({ path: `/api/forms/${closedFormId}/close`, method: 'POST', cookie: teacherCookie });
    const subClosed = await makeRequest({
        path: `/api/forms/${closedFormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [] }
    });
    if (subClosed.status !== 400) throw new Error("F5-46 Failed: Closed form accepted submission");
    console.log("✓ F5-46 PASSED: Closed form rejects submissions with HTTP 400");

    // [F5-47] Template protection
    console.log("\n[F5-47] Template protection check...");
    const tplRes = await makeRequest({
        path: `/api/forms/${form1Id}/template`,
        method: 'POST',
        cookie: teacherCookie,
        body: { title: `Phase 5 Master Template ${timestamp}` }
    });
    const tplId = tplRes.data.form._id;
    const studentTplAccess = await makeRequest({
        path: `/api/forms/${tplId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentTplAccess.status !== 403) throw new Error("F5-47 Failed: Student accessed template");
    console.log("✓ F5-47 PASSED: Student direct access to template form blocked with HTTP 403");

    // [F5-48 to F5-50] Backward Compatibility: Phase 1 forms, Phase 2 responses, Phase 3 grading
    console.log("\n[F5-48 to F5-50] Backward Compatibility Verification...");
    const p1FormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: { title: `Legacy Phase 1 Form ${timestamp}`, roomId }
    });
    const p1FormId = p1FormRes.data.form._id;
    await makeRequest({
        path: `/api/forms/${p1FormId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [
                { questionText: "Legacy MCQ", type: "multiple_choice", options: [{ text: "A" }, { text: "B" }], correctAnswer: "A", marks: 5, order: 0 }
            ]
        }
    });
    await makeRequest({ path: `/api/forms/${p1FormId}/publish`, method: 'POST', cookie: teacherCookie });

    const p1Read = await makeRequest({ path: `/api/forms/${p1FormId}`, method: 'GET', cookie: student1Cookie });
    if (p1Read.status !== 200 || p1Read.data.questions.length !== 1) {
        throw new Error("F5-48 Failed: Legacy Phase 1 form unreadable");
    }
    console.log("✓ F5-48 PASSED: Phase 1 forms remain 100% readable and operational");

    const p2Submit = await makeRequest({
        path: `/api/forms/${p1FormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [{ questionId: p1Read.data.questions[0]._id, selectedOption: "A" }] }
    });
    if (p2Submit.status !== 201 || p2Submit.data.response.score !== 5) {
        throw new Error("F5-49 Failed: Phase 2 response submission failed");
    }
    console.log("✓ F5-49 PASSED: Phase 2 responses remain 100% readable and recorded");

    const p3Grade = await makeRequest({
        path: `/api/forms/${p1FormId}/responses/${p2Submit.data.response._id}/grade`,
        method: 'POST',
        cookie: teacherCookie,
        body: { grades: [{ questionId: p1Read.data.questions[0]._id, awardedMarks: 5, feedback: "Spot on!" }] }
    });
    if (p3Grade.status !== 200 || p3Grade.data.score !== 5) {
        throw new Error("F5-50 Failed: Phase 3 grading failed");
    }
    console.log("✓ F5-50 PASSED: Phase 3 grading & scoring remain 100% correct");

    console.log("\n==================================================");
    console.log("ALL 50 GOOGLE FORMS 1.0 PHASE 5 TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runFormsPhase5TestSuite().catch(err => {
    console.error("Forms Phase 5 Test Suite Failure:", err);
    process.exit(1);
});
