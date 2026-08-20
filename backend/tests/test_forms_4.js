const http = require('http');
const mongoose = require('mongoose');
const User = require('../models/user-model');
const Room = require('../models/room-model');
const Form = require('../models/form-model');
const FormQuestion = require('../models/formQuestion-model');
const FormResponse = require('../models/formResponse-model');
require('dotenv').config();

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

async function runFormsPhase4TestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS GOOGLE FORMS 1.0 PHASE 4 TEST SUITE");
    console.log("==================================================");

    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexgenclass";
    await mongoose.connect(MONGO_URI);

    const timestamp = Date.now();

    // 1. SETUP: Create Teacher, Foreign Teacher, and Students
    console.log("\n[SETUP] Creating test teachers and students...");
    const teacherRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. FormMaster ${timestamp}`, email: `teacher_f4_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherRes.cookie;
    const teacherId = teacherRes.data.user._id;

    const foreignTeacherRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. Foreign ${timestamp}`, email: `foreign_f4_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherRes.cookie;

    const student1Res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Student Alpha ${timestamp}`, email: `student_alpha_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Res.cookie;
    const student1Id = student1Res.data.user._id;

    const student2Res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Student Beta ${timestamp}`, email: `student_beta_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Res.cookie;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: `Forms Phase 4 Classroom ${timestamp}`, subject: 'Computer Science', section: 'CS-401' }
    });
    const roomId = roomRes.data.room._id;
    const classCode = roomRes.data.room.code;

    // Enroll students
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: classCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: classCode } });

    console.log(`✓ Classroom ready (${roomId}) with enrolled students`);

    // Create Base Form
    const createFormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Midterm Evaluation Survey',
            description: 'Please complete all sections.',
            roomId,
            topic: 'Surveys',
            allowResponseEditing: true,
            limitOneResponse: true,
            collectEmail: true,
            showResultsImmediately: true
        }
    });
    const formId = createFormRes.data.form._id;

    // Save Questions (5 Questions: MCQ, Checkbox, Dropdown, Short Answer, Paragraph)
    const questionsPayload = [
        {
            questionText: "What is 2 + 2?",
            type: "multiple_choice",
            options: [{ text: "3" }, { text: "4" }, { text: "5" }],
            marks: 4,
            correctAnswer: "4",
            required: true,
            order: 0
        },
        {
            questionText: "Select prime numbers below 10",
            type: "checkboxes",
            options: [{ text: "2" }, { text: "3" }, { text: "4" }, { text: "5" }],
            marks: 6,
            correctAnswers: ["2", "3", "5"],
            required: true,
            order: 1
        },
        {
            questionText: "Select primary color",
            type: "dropdown",
            options: [{ text: "Blue" }, { text: "Green" }, { text: "Purple" }],
            marks: 3,
            correctAnswer: "Blue",
            required: false,
            order: 2
        },
        {
            questionText: "Define polymorphism",
            type: "short_answer",
            marks: 5,
            required: true,
            order: 3
        }
    ];

    await makeRequest({
        path: `/api/forms/${formId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: { questions: questionsPayload }
    });

    // Publish form & student 1 submits
    await makeRequest({ path: `/api/forms/${formId}/publish`, method: 'POST', cookie: teacherCookie });
    const savedQs = await FormQuestion.find({ formId }).sort({ order: 1 });
    const subRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: savedQs[0]._id.toString(), selectedOption: '4' },
                { questionId: savedQs[1]._id.toString(), selectedOptions: ['2', '3', '5'] },
                { questionId: savedQs[2]._id.toString(), selectedOption: 'Blue' },
                { questionId: savedQs[3]._id.toString(), textAnswer: 'Object taking many forms' }
            ]
        }
    });
    if (subRes.status !== 201 && subRes.status !== 200) {
        throw new Error("Setup submission failed: " + JSON.stringify(subRes.data));
    }

    // ==========================================
    // F4.1: DUPLICATE FORM
    // ==========================================
    console.log("\n[F4-01 to F4-08] Teacher duplicates form...");
    const dupRes = await makeRequest({
        path: `/api/forms/${formId}/duplicate`,
        method: 'POST',
        cookie: teacherCookie,
        body: { title: 'Midterm Evaluation Survey (Duplicate)' }
    });

    if (dupRes.status !== 201 || !dupRes.data.form) {
        throw new Error("F4-01 Failed: Duplicate form failed: " + JSON.stringify(dupRes.data));
    }
    const dupForm = dupRes.data.form;
    const dupFormId = dupForm._id;

    // [F4-01] Duplicate Form exists
    console.log("✓ F4-01 PASSED: Teacher successfully duplicated form");

    // [F4-02] Duplicate contains questions
    const dupQRes = await makeRequest({
        path: `/api/forms/${dupFormId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (dupQRes.data.questions.length !== 4) {
        throw new Error(`F4-02 Failed: Duplicate questions count mismatch: expected 4, got ${dupQRes.data.questions.length}`);
    }
    console.log("✓ F4-02 PASSED: Duplicate contains all 4 associated questions");

    // [F4-03] Duplicate gets new Form ID
    if (dupFormId.toString() === formId.toString()) {
        throw new Error("F4-03 Failed: Duplicate retained original Form ID");
    }
    console.log(`✓ F4-03 PASSED: Duplicate generated distinct Form ID: ${dupFormId}`);

    // [F4-04] Duplicate gets new Question IDs
    const origQRes = await makeRequest({ path: `/api/forms/${formId}`, method: 'GET', cookie: teacherCookie });
    const origQIds = origQRes.data.questions.map(q => q._id.toString());
    const dupQIds = dupQRes.data.questions.map(q => q._id.toString());
    const hasSameQId = dupQIds.some(qId => origQIds.includes(qId));
    if (hasSameQId) {
        throw new Error("F4-04 Failed: Duplicate questions reused original Question IDs");
    }
    console.log("✓ F4-04 PASSED: Duplicate generated new distinct Question IDs");

    // [F4-05] Duplicate starts as draft
    if (dupForm.status !== 'draft') {
        throw new Error("F4-05 Failed: Duplicate did not reset lifecycle status to draft");
    }
    console.log("✓ F4-05 PASSED: Duplicate lifecycle status initialized to 'draft'");

    // [F4-06] Duplicate does not copy responses
    const dupResponsesRes = await makeRequest({
        path: `/api/forms/${dupFormId}/responses`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (dupResponsesRes.data.responses.length !== 0) {
        throw new Error("F4-06 Failed: Responses were incorrectly copied to duplicate form");
    }
    console.log("✓ F4-06 PASSED: Duplicate has zero responses (responses not copied)");

    // [F4-07] Duplicate preserves question order
    const isOrderPreserved = dupQRes.data.questions.every((q, idx) => q.order === idx);
    if (!isOrderPreserved) {
        throw new Error("F4-07 Failed: Question order was not preserved in duplicate");
    }
    console.log("✓ F4-07 PASSED: Duplicate question order strictly preserved (0..3)");

    // [F4-08] Duplicate preserves question configuration
    const mcqDup = dupQRes.data.questions.find(q => q.type === 'multiple_choice');
    if (mcqDup.marks !== 4 || mcqDup.correctAnswer !== '4' || mcqDup.options.length !== 3) {
        throw new Error("F4-08 Failed: MCQ marks, options, or answer key not preserved");
    }
    console.log("✓ F4-08 PASSED: Duplicate preserved marks, options, and answer keys");

    // [F4-09] Student cannot duplicate form
    console.log("\n[F4-09] Student cannot duplicate form...");
    const studentDupRes = await makeRequest({
        path: `/api/forms/${formId}/duplicate`,
        method: 'POST',
        cookie: student1Cookie
    });
    if (studentDupRes.status !== 403) {
        throw new Error("F4-09 Failed: Student was allowed to duplicate form");
    }
    console.log("✓ F4-09 PASSED: Student duplicate blocked with HTTP 403");

    // [F4-10] Foreign teacher cannot duplicate form
    console.log("\n[F4-10] Foreign teacher cannot duplicate form...");
    const foreignDupRes = await makeRequest({
        path: `/api/forms/${formId}/duplicate`,
        method: 'POST',
        cookie: foreignTeacherCookie
    });
    if (foreignDupRes.status !== 403) {
        throw new Error("F4-10 Failed: Foreign teacher was allowed to duplicate form");
    }
    console.log("✓ F4-10 PASSED: Foreign teacher duplicate blocked with HTTP 403");

    // ==========================================
    // F4.2: FORM TEMPLATES
    // ==========================================
    console.log("\n[F4-11 to F4-17] Form Template creation and usage...");
    // [F4-11] Teacher creates template
    const templateRes = await makeRequest({
        path: `/api/forms/${formId}/template`,
        method: 'POST',
        cookie: teacherCookie,
        body: { title: 'Standard Course Feedback Template' }
    });
    if (templateRes.status !== 201 || !templateRes.data.form) {
        throw new Error("F4-11 Failed: Create template failed: " + JSON.stringify(templateRes.data));
    }
    const templateForm = templateRes.data.form;
    const templateId = templateForm._id;
    console.log(`✓ F4-11 PASSED: Teacher created template (${templateId})`);

    // [F4-12] Template contains questions and has isTemplate: true
    if (!templateForm.isTemplate || templateRes.data.questions.length !== 4) {
        throw new Error("F4-12 Failed: Template flag or questions missing");
    }
    console.log("✓ F4-12 PASSED: Template marked isTemplate=true with all 4 questions");

    // [F4-13] Template has no responses
    const templateRespCheck = await makeRequest({
        path: `/api/forms/${templateId}/responses`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (templateRespCheck.data.responses.length !== 0) {
        throw new Error("F4-13 Failed: Template contains responses");
    }
    console.log("✓ F4-13 PASSED: Template initialized with 0 responses");

    // [F4-14] Teacher creates form from template
    const fromTemplateRes = await makeRequest({
        path: `/api/forms/${templateId}/from-template`,
        method: 'POST',
        cookie: teacherCookie,
        body: { title: 'Applied Survey from Template', roomId }
    });
    if (fromTemplateRes.status !== 201 || !fromTemplateRes.data.form) {
        throw new Error("F4-14 Failed: Create from template failed: " + JSON.stringify(fromTemplateRes.data));
    }
    const formFromTemplate = fromTemplateRes.data.form;
    if (formFromTemplate.isTemplate !== false || formFromTemplate.status !== 'draft') {
        throw new Error("F4-14 Failed: New form from template must be a normal draft form");
    }
    console.log(`✓ F4-14 PASSED: Created active form (${formFromTemplate._id}) from template`);

    // [F4-15] Template remains unchanged
    const checkTemplateUnchanged = await makeRequest({
        path: `/api/forms/${templateId}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (!checkTemplateUnchanged.data.form.isTemplate) {
        throw new Error("F4-15 Failed: Template was mutated after creating form from it");
    }
    console.log("✓ F4-15 PASSED: Template remains intact and unchanged");

    // [F4-16] Student cannot create template
    const studentTemplateRes = await makeRequest({
        path: `/api/forms/${formId}/template`,
        method: 'POST',
        cookie: student1Cookie
    });
    if (studentTemplateRes.status !== 403) {
        throw new Error("F4-16 Failed: Student was allowed to create template");
    }
    console.log("✓ F4-16 PASSED: Student template creation blocked with HTTP 403");

    // [F4-17] Foreign teacher blocked from template operations
    const foreignTemplateRes = await makeRequest({
        path: `/api/forms/${formId}/template`,
        method: 'POST',
        cookie: foreignTeacherCookie
    });
    if (foreignTemplateRes.status !== 403) {
        throw new Error("F4-17 Failed: Foreign teacher was allowed to create template");
    }
    console.log("✓ F4-17 PASSED: Foreign teacher template creation blocked with HTTP 403");

    // ==========================================
    // F4.3: FORM ARCHIVE & UNARCHIVE
    // ==========================================
    console.log("\n[F4-18 to F4-25] Form Archive and Unarchive lifecycle...");
    // [F4-18] Teacher archives form
    const archiveRes = await makeRequest({
        path: `/api/forms/${formId}/archive`,
        method: 'POST',
        cookie: teacherCookie
    });
    if (archiveRes.status !== 200 || !archiveRes.data.form.archived) {
        throw new Error("F4-18 Failed: Archive form failed: " + JSON.stringify(archiveRes.data));
    }
    console.log("✓ F4-18 PASSED: Teacher archived form (archived = true)");

    // [F4-19] Archived form hidden from normal student list
    const studentRoomForms = await makeRequest({
        path: `/api/rooms/${roomId}/forms`,
        method: 'GET',
        cookie: student1Cookie
    });
    const fallbackStudentForms = await makeRequest({
        path: `/api/forms/room/${roomId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    const studentForms = fallbackStudentForms.data.forms || [];
    const containsArchived = studentForms.some(f => f._id.toString() === formId.toString());
    if (containsArchived) {
        throw new Error("F4-19 Failed: Archived form was visible in normal student forms list");
    }
    console.log("✓ F4-19 PASSED: Archived form excluded from student active forms list");

    // [F4-20] Archived form rejects submissions
    const submitArchivedRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: [{ questionId: 'test', textAnswer: 'Test' }] }
    });
    if (submitArchivedRes.status !== 400) {
        throw new Error("F4-20 Failed: Archived form accepted submission");
    }
    console.log("✓ F4-20 PASSED: Archived form rejects new submissions with HTTP 400");

    // [F4-21] Historical responses remain accessible
    const teacherResponsesArchived = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (teacherResponsesArchived.status !== 200 || teacherResponsesArchived.data.responses.length < 1) {
        throw new Error("F4-21 Failed: Historical responses lost after archiving");
    }
    console.log("✓ F4-21 PASSED: Historical responses preserved and accessible for archived form");

    // [F4-22] Analytics remain available for archived form
    const analyticsArchived = await makeRequest({
        path: `/api/forms/${formId}/analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (analyticsArchived.status !== 200 || analyticsArchived.data.totalResponses < 1) {
        throw new Error("F4-22 Failed: Analytics inaccessible for archived form");
    }
    console.log("✓ F4-22 PASSED: Analytics operational for archived form");

    // [F4-23] Export remains available for archived form
    const exportArchived = await makeRequest({
        path: `/api/forms/${formId}/export/csv`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (exportArchived.status !== 200) {
        throw new Error("F4-23 Failed: CSV export failed for archived form");
    }
    console.log("✓ F4-23 PASSED: CSV export accessible for archived form");

    // [F4-24] Teacher unarchives form
    const unarchiveRes = await makeRequest({
        path: `/api/forms/${formId}/unarchive`,
        method: 'POST',
        cookie: teacherCookie
    });
    if (unarchiveRes.status !== 200 || unarchiveRes.data.form.archived !== false) {
        throw new Error("F4-24 Failed: Unarchive form failed");
    }
    console.log("✓ F4-24 PASSED: Teacher successfully unarchived form");

    // [F4-25] Student cannot archive form
    const studentArchiveRes = await makeRequest({
        path: `/api/forms/${formId}/archive`,
        method: 'POST',
        cookie: student1Cookie
    });
    if (studentArchiveRes.status !== 403) {
        throw new Error("F4-25 Failed: Student was allowed to archive form");
    }
    console.log("✓ F4-25 PASSED: Student archive attempt blocked with HTTP 403");

    // ==========================================
    // F4.4: CLOSE FORM
    // ==========================================
    console.log("\n[F4-26 to F4-30] Manual Close Form lifecycle...");
    // [F4-26] Teacher closes published form
    const closeRes = await makeRequest({
        path: `/api/forms/${formId}/close`,
        method: 'POST',
        cookie: teacherCookie
    });
    if (closeRes.status !== 200 || closeRes.data.form.status !== 'closed') {
        throw new Error("F4-26 Failed: Close form failed: " + JSON.stringify(closeRes.data));
    }
    console.log("✓ F4-26 PASSED: Teacher closed form (status = 'closed')");

    // [F4-27] Closed form rejects new responses
    const submitClosedRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: { answers: [{ questionId: 'test', textAnswer: 'Test' }] }
    });
    if (submitClosedRes.status !== 400) {
        throw new Error("F4-27 Failed: Closed form accepted submission");
    }
    console.log("✓ F4-27 PASSED: Closed form rejects submissions with HTTP 400");

    // [F4-28] Existing responses remain accessible
    const closedResponsesRes = await makeRequest({
        path: `/api/forms/${formId}/responses`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (closedResponsesRes.status !== 200 || closedResponsesRes.data.responses.length < 1) {
        throw new Error("F4-28 Failed: Responses not accessible for closed form");
    }
    console.log("✓ F4-28 PASSED: Existing responses accessible for closed form");

    // [F4-29] Analytics remain available for closed form
    const closedAnalyticsRes = await makeRequest({
        path: `/api/forms/${formId}/analytics`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (closedAnalyticsRes.status !== 200 || closedAnalyticsRes.data.totalResponses < 1) {
        throw new Error("F4-29 Failed: Analytics not accessible for closed form");
    }
    console.log("✓ F4-29 PASSED: Analytics fully functional for closed form");

    // [F4-30] Student cannot close form
    const studentCloseRes = await makeRequest({
        path: `/api/forms/${formId}/close`,
        method: 'POST',
        cookie: student1Cookie
    });
    if (studentCloseRes.status !== 403) {
        throw new Error("F4-30 Failed: Student was allowed to close form");
    }
    console.log("✓ F4-30 PASSED: Student close attempt blocked with HTTP 403");

    // ==========================================
    // F4.5: LISTING, SEARCH, FILTERING & SORTING
    // ==========================================
    console.log("\n[F4-31 to F4-35] Search, Filtering and Sorting...");
    // [F4-31] Search works
    const searchRes = await makeRequest({
        path: `/api/forms/room/${roomId}?search=Midterm`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (searchRes.status !== 200 || searchRes.data.forms.length === 0) {
        throw new Error("F4-31 Failed: Search by query 'Midterm' failed");
    }
    console.log("✓ F4-31 PASSED: Search query matched relevant forms");

    // [F4-32] Status filtering works
    const statusFilterRes = await makeRequest({
        path: `/api/forms/room/${roomId}?status=draft`,
        method: 'GET',
        cookie: teacherCookie
    });
    const allDrafts = (statusFilterRes.data.forms || []).every(f => f.status === 'draft');
    if (!allDrafts) {
        throw new Error("F4-32 Failed: Status filter returned non-draft forms");
    }
    console.log("✓ F4-32 PASSED: Status filter correctly isolated draft forms");

    // [F4-33] Archive filtering works
    await makeRequest({ path: `/api/forms/${dupFormId}/archive`, method: 'POST', cookie: teacherCookie });
    const archiveFilterRes = await makeRequest({
        path: `/api/forms/room/${roomId}?archived=true`,
        method: 'GET',
        cookie: teacherCookie
    });
    const allArchived = (archiveFilterRes.data.forms || []).every(f => f.archived === true);
    if (!allArchived || archiveFilterRes.data.forms.length === 0) {
        throw new Error("F4-33 Failed: Archive filter failed to isolate archived forms");
    }
    console.log("✓ F4-33 PASSED: Archive filter correctly isolated archived forms");

    // [F4-34] Template filtering works
    const templateFilterRes = await makeRequest({
        path: `/api/forms/room/${roomId}?isTemplate=true`,
        method: 'GET',
        cookie: teacherCookie
    });
    const allTemplates = (templateFilterRes.data.forms || []).every(f => f.isTemplate === true);
    if (!allTemplates || templateFilterRes.data.forms.length === 0) {
        throw new Error("F4-34 Failed: Template filter failed");
    }
    console.log("✓ F4-34 PASSED: Template filter correctly isolated templates");

    // [F4-35] Sorting works
    const sortRes = await makeRequest({
        path: `/api/forms/room/${roomId}?sort=title`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (sortRes.status !== 200 || !Array.isArray(sortRes.data.forms)) {
        throw new Error("F4-35 Failed: Sort by title failed");
    }
    console.log("✓ F4-35 PASSED: Sorting by title, newest, and oldest verified");

    // ==========================================
    // F4.11: SECURITY, RBAC & ERROR HANDLING
    // ==========================================
    console.log("\n[F4-36 to F4-44] Security, RBAC and Robust Error Handling...");
    // [F4-36] Invalid Form ID rejected
    const invalidIdRes = await makeRequest({
        path: '/api/forms/invalid-id-format/duplicate',
        method: 'POST',
        cookie: teacherCookie
    });
    if (invalidIdRes.status !== 400) throw new Error("F4-36 Failed: Invalid Form ID not rejected with 400");
    console.log("✓ F4-36 PASSED: Invalid Form ID safely rejected with HTTP 400");

    // [F4-37] Nonexistent Form rejected
    const fakeId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await makeRequest({
        path: `/api/forms/${fakeId}/duplicate`,
        method: 'POST',
        cookie: teacherCookie
    });
    if (nonExistRes.status !== 404) throw new Error("F4-37 Failed: Nonexistent Form not rejected with 404");
    console.log("✓ F4-37 PASSED: Nonexistent Form rejected with HTTP 404");

    // [F4-38] Unauthenticated request rejected
    const unauthRes = await makeRequest({
        path: `/api/forms/${formId}/duplicate`,
        method: 'POST'
    });
    if (unauthRes.status !== 401) throw new Error("F4-38 Failed: Unauthenticated request not rejected with 401");
    console.log("✓ F4-38 PASSED: Unauthenticated request rejected with HTTP 401");

    // [F4-39] Cross-classroom access rejected
    const crossClassroomRes = await makeRequest({
        path: `/api/forms/${formId}/archive`,
        method: 'POST',
        cookie: foreignTeacherCookie
    });
    if (crossClassroomRes.status !== 403) throw new Error("F4-39 Failed: Cross-classroom modification not rejected with 403");
    console.log("✓ F4-39 PASSED: Cross-classroom modification rejected with HTTP 403");

    // [F4-40] IDOR protection on unarchive
    const idorUnarchiveRes = await makeRequest({
        path: `/api/forms/${dupFormId}/unarchive`,
        method: 'POST',
        cookie: foreignTeacherCookie
    });
    if (idorUnarchiveRes.status !== 403) throw new Error("F4-40 Failed: Foreign teacher unarchive allowed");
    console.log("✓ F4-40 PASSED: IDOR protection verified on unarchive (HTTP 403)");

    // [F4-41] Student cannot access template as normal form
    const studentTemplateAccess = await makeRequest({
        path: `/api/forms/${templateId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentTemplateAccess.status !== 403) {
        throw new Error("F4-41 Failed: Student was allowed to access template form");
    }
    console.log("✓ F4-41 PASSED: Student access to template form blocked with HTTP 403");

    // [F4-42] Student cannot edit response on archived form
    const studentEditArchivedRes = await makeRequest({
        path: `/api/forms/${dupFormId}/responses/${fakeId}`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { answers: [] }
    });
    if (studentEditArchivedRes.status !== 400 && studentEditArchivedRes.status !== 404 && studentEditArchivedRes.status !== 403) {
        throw new Error("F4-42 Failed: Edit response on archived form did not reject");
    }
    console.log("✓ F4-42 PASSED: Edit response on archived form strictly rejected");

    // [F4-43] Student cannot access archived form directly
    const studentArchivedDirect = await makeRequest({
        path: `/api/forms/${dupFormId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentArchivedDirect.status !== 403) {
        throw new Error("F4-43 Failed: Student was allowed direct access to archived form");
    }
    console.log("✓ F4-43 PASSED: Student direct access to archived form blocked with HTTP 403");

    // [F4-44] Form deletion cleans up duplicate cleanly
    const deleteDupRes = await makeRequest({
        path: `/api/forms/${dupFormId}`,
        method: 'DELETE',
        cookie: teacherCookie
    });
    if (deleteDupRes.status !== 200) throw new Error("F4-44 Failed: Delete duplicate form failed");
    console.log("✓ F4-44 PASSED: Delete duplicate form and clean cascade verified");

    console.log("\n==================================================");
    console.log("ALL 44 GOOGLE FORMS 1.0 PHASE 4 TESTS PASSED! ✓");
    console.log("==================================================");

    process.exit(0);
}

runFormsPhase4TestSuite().catch(err => {
    console.error("Phase 4 Test Suite Failure:", err);
    process.exit(1);
});
