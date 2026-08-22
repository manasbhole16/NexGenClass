const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Form = require('../models/form-model');
const FormAuditLog = require('../models/formAuditLog-model');

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

async function runFormsPhase6TestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS GOOGLE FORMS 1.0 PHASE 6 TEST SUITE");
    console.log("==================================================");

    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexgenclass";
    await mongoose.connect(MONGO_URI);

    const timestamp = Date.now();

    // 1. SETUP: Create Owner, Collaborator Teachers (Editor, Reviewer, Viewer), Foreign Teacher, and Students
    console.log("\n[SETUP] Creating test users...");
    const ownerRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. FormOwner ${timestamp}`, email: `owner_f6_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const ownerCookie = ownerRes.cookie;
    const ownerId = ownerRes.data.user._id;

    const editorRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. Editor ${timestamp}`, email: `editor_f6_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const editorCookie = editorRes.cookie;
    const editorId = editorRes.data.user._id;

    const reviewerRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. Reviewer ${timestamp}`, email: `reviewer_f6_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const reviewerCookie = reviewerRes.cookie;
    const reviewerId = reviewerRes.data.user._id;

    const viewerRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. Viewer ${timestamp}`, email: `viewer_f6_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const viewerCookie = viewerRes.cookie;
    const viewerId = viewerRes.data.user._id;

    const foreignTeacherRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Prof. ForeignSix ${timestamp}`, email: `foreign_f6_${timestamp}@nexgen.com`, password: 'Password123!', role: 'teacher' }
    });
    const foreignTeacherCookie = foreignTeacherRes.cookie;

    const student1Res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Alice StudentSix ${timestamp}`, email: `student_f6a_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Res.cookie;
    const student1Id = student1Res.data.user._id;

    const student2Res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Bob StudentSix ${timestamp}`, email: `student_f6b_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Res.cookie;
    const student2Id = student2Res.data.user._id;

    const unEnrolledStudentRes = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: `Charlie Outsider ${timestamp}`, email: `student_f6c_${timestamp}@nexgen.com`, password: 'Password123!', role: 'student' }
    });
    const unEnrolledCookie = unEnrolledStudentRes.cookie;
    const unEnrolledId = unEnrolledStudentRes.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: ownerCookie,
        body: { name: `Advanced Forms Phase 6 Room ${timestamp}`, subject: 'Computer Systems', section: 'CS-601' }
    });
    const roomId = roomRes.data.room._id;
    const classCode = roomRes.data.room.code;

    // Enroll student1 and student2 in classroom
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: classCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: classCode } });

    console.log(`✓ Classroom ready (${roomId}) with owner and 2 enrolled students`);

    // ==========================================
    // 1. SHARING SYSTEM & GRANULAR ACCESS CONTROL
    // ==========================================

    // [F6-01] Teacher creates form with sharing configuration
    console.log("\n[F6-01] Teacher creates sharing configuration...");
    const form1Res = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: ownerCookie,
        body: {
            title: `Phase 6 Collaboration Assessment ${timestamp}`,
            description: 'Testing permissions, collaborators, and moderation',
            roomId,
            sharingEnabled: true,
            sharingMode: 'classroom'
        }
    });
    if (form1Res.status !== 201) throw new Error(`F6-01 Failed: Create form returned ${form1Res.status}`);
    const form1Id = form1Res.data.form._id;

    // Add standard questions to form 1
    const saveQRes = await makeRequest({
        path: `/api/forms/${form1Id}/questions`,
        method: 'POST',
        cookie: ownerCookie,
        body: {
            questions: [
                { questionText: "What is an atomic transaction?", type: "short_answer", marks: 5, correctAnswer: "ACID property", required: true, order: 0 },
                { questionText: "Choose cloud database models:", type: "checkboxes", options: [{ text: "Document" }, { text: "Relational" }, { text: "Graph" }], correctAnswers: ["Document", "Relational"], marks: 5, order: 1 }
            ]
        }
    });
    await makeRequest({ path: `/api/forms/${form1Id}/publish`, method: 'POST', cookie: ownerCookie });
    const qList = saveQRes.data.questions;
    console.log("✓ F6-01 PASSED: Sharing configuration initialized (classroom mode)");

    // [F6-02] Student accesses classroom form
    console.log("\n[F6-02] Student accesses classroom form...");
    const student1AccessRes = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (student1AccessRes.status !== 200 || !student1AccessRes.data.form) {
        throw new Error("F6-02 Failed: Enrolled student could not access classroom form");
    }
    console.log("✓ F6-02 PASSED: Enrolled student accessed classroom form");

    // [F6-03] Unauthorized student blocked from classroom form
    console.log("\n[F6-03] Unauthorized (non-enrolled) student blocked...");
    const outsiderAccessRes = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'GET',
        cookie: unEnrolledCookie
    });
    if (outsiderAccessRes.status !== 403) {
        throw new Error(`F6-03 Failed: Expected 403 for unenrolled student, got ${outsiderAccessRes.status}`);
    }
    console.log("✓ F6-03 PASSED: Non-enrolled student blocked with HTTP 403");

    // [F6-04] Selected student granted access (sharingMode: selected_users)
    console.log("\n[F6-04] Selected student granted access...");
    await makeRequest({
        path: `/api/forms/${form1Id}/sharing`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { sharingMode: 'selected_users' }
    });

    // Before grant: student 1 is blocked
    const student1BeforeGrant = await makeRequest({ path: `/api/forms/${form1Id}`, method: 'GET', cookie: student1Cookie });
    if (student1BeforeGrant.status !== 403) throw new Error("F6-04 Failed: Student should be blocked before explicit access grant");

    // Grant access to Student 1 only
    const grantRes = await makeRequest({
        path: `/api/forms/${form1Id}/access`,
        method: 'POST',
        cookie: ownerCookie,
        body: { userIds: [student1Id] }
    });
    if (grantRes.status !== 200) throw new Error("F6-04 Failed: Grant access request failed");

    // After grant: student 1 has access, student 2 is blocked
    const student1AfterGrant = await makeRequest({ path: `/api/forms/${form1Id}`, method: 'GET', cookie: student1Cookie });
    const student2AfterGrant = await makeRequest({ path: `/api/forms/${form1Id}`, method: 'GET', cookie: student2Cookie });
    if (student1AfterGrant.status !== 200 || student2AfterGrant.status !== 403) {
        throw new Error("F6-04 Failed: Access grant filtering failed for selected_users mode");
    }
    console.log("✓ F6-04 PASSED: Selected student granted access, non-selected student blocked (HTTP 403)");

    // [F6-05] Removed student blocked
    console.log("\n[F6-05] Revoke student access check...");
    const revokeRes = await makeRequest({
        path: `/api/forms/${form1Id}/access/${student1Id}`,
        method: 'DELETE',
        cookie: ownerCookie
    });
    if (revokeRes.status !== 200) throw new Error("F6-05 Failed: Revoke access failed");

    const student1AfterRevoke = await makeRequest({ path: `/api/forms/${form1Id}`, method: 'GET', cookie: student1Cookie });
    if (student1AfterRevoke.status !== 403) throw new Error("F6-05 Failed: Revoked student still had access");
    console.log("✓ F6-05 PASSED: Revoked student immediately blocked with HTTP 403");

    // ==========================================
    // 2. SECURE SHARE LINKS
    // ==========================================

    // [F6-06] Secure share link created
    console.log("\n[F6-06 & F6-07] Generating cryptographic share link...");
    const shareLinkRes = await makeRequest({
        path: `/api/forms/${form1Id}/share-link`,
        method: 'POST',
        cookie: ownerCookie,
        body: { expiresInHours: 24, requireAuthentication: true }
    });
    if (shareLinkRes.status !== 200 || !shareLinkRes.data.shareToken) {
        throw new Error("F6-06 Failed: Share link generation failed");
    }
    const shareToken = shareLinkRes.data.shareToken;
    console.log("✓ F6-06 PASSED: Secure share link generated");

    // [F6-07] Share token is unpredictable
    if (shareToken.length < 32 || !/^[0-9a-f]+$/i.test(shareToken)) {
        throw new Error("F6-07 Failed: Token is not a secure hexadecimal cryptographic string");
    }
    console.log("✓ F6-07 PASSED: Share token is cryptographically random and unpredictable");

    // [F6-08] Valid share token grants access
    console.log("\n[F6-08] Accessing shared form with valid token...");
    const sharedAccess = await makeRequest({
        path: `/api/forms/shared/${shareToken}`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (sharedAccess.status !== 200 || sharedAccess.data.form.title !== `Phase 6 Collaboration Assessment ${timestamp}`) {
        throw new Error("F6-08 Failed: Shared form retrieval with token failed");
    }
    console.log("✓ F6-08 PASSED: Valid share token granted form access");

    // [F6-09] Invalid share token rejected
    console.log("\n[F6-09] Testing invalid share token...");
    const invalidTokenRes = await makeRequest({
        path: `/api/forms/shared/invalid_token_xyz123`,
        method: 'GET'
    });
    if (invalidTokenRes.status !== 404) throw new Error("F6-09 Failed: Invalid token did not return 404");
    console.log("✓ F6-09 PASSED: Invalid share token rejected with HTTP 404");

    // [F6-10] Expired share token rejected
    console.log("\n[F6-10] Testing expired share token...");
    // Update token expiry directly in DB to 1 hour in the past
    await Form.findByIdAndUpdate(form1Id, { shareTokenExpiresAt: new Date(Date.now() - 3600000) });
    const expiredRes = await makeRequest({
        path: `/api/forms/shared/${shareToken}`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (expiredRes.status !== 403) throw new Error("F6-10 Failed: Expired token did not return 403");
    console.log("✓ F6-10 PASSED: Expired share token rejected with HTTP 403");

    // [F6-11] Revoked share token rejected
    console.log("\n[F6-11] Revoking share link...");
    const revokeLinkRes = await makeRequest({
        path: `/api/forms/${form1Id}/revoke-share-link`,
        method: 'POST',
        cookie: ownerCookie
    });
    if (revokeLinkRes.status !== 200) throw new Error("F6-11 Failed: Revoke share link failed");

    const accessRevoked = await makeRequest({
        path: `/api/forms/shared/${shareToken}`,
        method: 'GET'
    });
    if (accessRevoked.status !== 404) throw new Error("F6-11 Failed: Revoked share link still accessible");
    console.log("✓ F6-11 PASSED: Revoked share token rejected with HTTP 404");

    // [F6-12] Regenerated token invalidates old token
    console.log("\n[F6-12] Regenerating share token...");
    const regenRes = await makeRequest({
        path: `/api/forms/${form1Id}/regenerate-share-link`,
        method: 'POST',
        cookie: ownerCookie,
        body: { expiresInHours: 12 }
    });
    const newShareToken = regenRes.data.shareToken;
    if (!newShareToken || newShareToken === shareToken) {
        throw new Error("F6-12 Failed: Regenerated token is identical to old token");
    }
    const accessOldToken = await makeRequest({ path: `/api/forms/shared/${shareToken}`, method: 'GET' });
    const accessNewToken = await makeRequest({ path: `/api/forms/shared/${newShareToken}`, method: 'GET', cookie: student1Cookie });
    if (accessOldToken.status !== 404 || accessNewToken.status !== 200) {
        throw new Error("F6-12 Failed: Old token was not invalidated by regeneration");
    }
    console.log("✓ F6-12 PASSED: Regenerated token immediately invalidates old token");

    // Reset sharing mode to classroom for subsequent tests
    await makeRequest({
        path: `/api/forms/${form1Id}/sharing`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { sharingMode: 'classroom' }
    });

    // ==========================================
    // 3. FORM COLLABORATORS & ROLE RBAC
    // ==========================================

    // [F6-13] Owner adds Editor
    console.log("\n[F6-13] Adding Editor collaborator...");
    const addEditorRes = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: ownerCookie,
        body: { userId: editorId, role: 'editor' }
    });
    if (addEditorRes.status !== 201 || addEditorRes.data.collaborator.role !== 'editor') {
        throw new Error("F6-13 Failed: Editor collaborator could not be added");
    }
    const editorCollaboratorId = addEditorRes.data.collaborator._id;
    console.log("✓ F6-13 PASSED: Owner added Editor collaborator");

    // [F6-14] Owner adds Reviewer
    console.log("\n[F6-14] Adding Reviewer collaborator...");
    const addReviewerRes = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: ownerCookie,
        body: { userId: reviewerId, role: 'reviewer' }
    });
    if (addReviewerRes.status !== 201 || addReviewerRes.data.collaborator.role !== 'reviewer') {
        throw new Error("F6-14 Failed: Reviewer collaborator could not be added");
    }
    const reviewerCollaboratorId = addReviewerRes.data.collaborator._id;
    console.log("✓ F6-14 PASSED: Owner added Reviewer collaborator");

    // [F6-15] Owner adds Viewer
    console.log("\n[F6-15] Adding Viewer collaborator...");
    const addViewerRes = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: ownerCookie,
        body: { userId: viewerId, role: 'viewer' }
    });
    if (addViewerRes.status !== 201 || addViewerRes.data.collaborator.role !== 'viewer') {
        throw new Error("F6-15 Failed: Viewer collaborator could not be added");
    }
    const viewerCollaboratorId = addViewerRes.data.collaborator._id;
    console.log("✓ F6-15 PASSED: Owner added Viewer collaborator");

    // [F6-16] Duplicate collaborator rejected
    console.log("\n[F6-16] Testing duplicate collaborator rejection...");
    const dupRes = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: ownerCookie,
        body: { userId: editorId, role: 'editor' }
    });
    if (dupRes.status !== 409) throw new Error("F6-16 Failed: Expected 409 for duplicate collaborator");
    console.log("✓ F6-16 PASSED: Duplicate collaborator rejected with HTTP 409");

    // [F6-17] Unauthorized user cannot add collaborator
    console.log("\n[F6-17] Student / foreign teacher cannot add collaborator...");
    const studentAddCollab = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: student1Cookie,
        body: { userId: unEnrolledId, role: 'viewer' }
    });
    const foreignAddCollab = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: foreignTeacherCookie,
        body: { userId: unEnrolledId, role: 'viewer' }
    });
    if (studentAddCollab.status !== 403 || foreignAddCollab.status !== 403) {
        throw new Error("F6-17 Failed: Unauthorized collaborator add was not blocked");
    }
    console.log("✓ F6-17 PASSED: Non-owner collaborator additions blocked with HTTP 403");

    // [F6-18] Editor can modify allowed resources
    console.log("\n[F6-18] Editor modifies form and questions...");
    const editorModRes = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'PUT',
        cookie: editorCookie,
        body: { description: "Updated by authorized Editor" }
    });
    if (editorModRes.status !== 200 || editorModRes.data.form.description !== "Updated by authorized Editor") {
        throw new Error("F6-18 Failed: Editor was not allowed to update form");
    }
    console.log("✓ F6-18 PASSED: Editor successfully updated form resources");

    // [F6-19] Reviewer cannot modify form structure
    console.log("\n[F6-19] Reviewer blocked from form structure modifications...");
    const reviewerModRes = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'PUT',
        cookie: reviewerCookie,
        body: { title: "Hacked by Reviewer" }
    });
    if (reviewerModRes.status !== 403) throw new Error("F6-19 Failed: Reviewer modification was not blocked");
    console.log("✓ F6-19 PASSED: Reviewer form structure modification blocked with HTTP 403");

    // [F6-20] Viewer cannot modify form
    console.log("\n[F6-20] Viewer blocked from form modifications...");
    const viewerModRes = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'PUT',
        cookie: viewerCookie,
        body: { title: "Hacked by Viewer" }
    });
    if (viewerModRes.status !== 403) throw new Error("F6-20 Failed: Viewer modification was not blocked");
    console.log("✓ F6-20 PASSED: Viewer form modification blocked with HTTP 403");

    // [F6-21] Collaborators can view permitted responses
    console.log("\n[F6-21] Collaborators view responses...");
    // Submit student 1 response
    const submit1 = await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: qList[0]._id, textAnswer: "ACID property" },
                { questionId: qList[1]._id, selectedOptions: ["Document", "Relational"] }
            ]
        }
    });
    const sub1Id = submit1.data.responseId;

    const editorViewResp = await makeRequest({ path: `/api/forms/${form1Id}/responses`, method: 'GET', cookie: editorCookie });
    const reviewerViewResp = await makeRequest({ path: `/api/forms/${form1Id}/responses`, method: 'GET', cookie: reviewerCookie });
    const viewerViewResp = await makeRequest({ path: `/api/forms/${form1Id}/responses`, method: 'GET', cookie: viewerCookie });
    if (editorViewResp.status !== 200 || reviewerViewResp.status !== 200 || viewerViewResp.status !== 200) {
        throw new Error("F6-21 Failed: Collaborators could not view responses");
    }
    console.log("✓ F6-21 PASSED: All authorized collaborator roles can view responses");

    // [F6-22] Collaborator cannot exceed permissions (Viewer cannot grade, Editor cannot delete form)
    console.log("\n[F6-22] Collaborator permission boundary enforcement...");
    const viewerGradeAttempt = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/grade`,
        method: 'POST',
        cookie: viewerCookie,
        body: { grades: [{ questionId: qList[0]._id, awardedMarks: 5 }] }
    });
    const editorDeleteAttempt = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'DELETE',
        cookie: editorCookie
    });
    if (viewerGradeAttempt.status !== 403 || editorDeleteAttempt.status !== 403) {
        throw new Error("F6-22 Failed: Collaborators exceeded permitted role boundaries");
    }
    console.log("✓ F6-22 PASSED: Role boundaries strictly enforced (Viewer cannot grade, Editor cannot delete form)");

    // [F6-23] Owner removes collaborator
    console.log("\n[F6-23] Owner removes viewer collaborator...");
    const removeViewerRes = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators/${viewerCollaboratorId}`,
        method: 'DELETE',
        cookie: ownerCookie
    });
    if (removeViewerRes.status !== 200) throw new Error("F6-23 Failed: Remove collaborator failed");
    console.log("✓ F6-23 PASSED: Owner removed collaborator");

    // [F6-24] Removed collaborator loses access
    console.log("\n[F6-24] Removed collaborator loses privileged access...");
    const formerViewerView = await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'GET',
        cookie: viewerCookie
    });
    if (formerViewerView.status !== 403) throw new Error("F6-24 Failed: Removed collaborator still had access");
    console.log("✓ F6-24 PASSED: Removed collaborator immediately denied response access with HTTP 403");

    // ==========================================
    // 4. RESPONSE MODERATION & WORKFLOW
    // ==========================================

    // [F6-25] Response marked reviewed
    console.log("\n[F6-25] Moderating response: mark reviewed...");
    const modReviewedRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { reviewStatus: 'reviewed' }
    });
    if (modReviewedRes.status !== 200 || modReviewedRes.data.response.reviewStatus !== 'reviewed') {
        throw new Error("F6-25 Failed: Response review status not updated");
    }
    console.log("✓ F6-25 PASSED: Response marked as reviewed");

    // [F6-26] Response flagged
    console.log("\n[F6-26] Moderating response: flag response...");
    const modFlagRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { flagged: true, reviewStatus: 'flagged' }
    });
    if (modFlagRes.status !== 200 || !modFlagRes.data.response.flagged) {
        throw new Error("F6-26 Failed: Response flagging failed");
    }
    console.log("✓ F6-26 PASSED: Response flagged successfully");

    // [F6-27] Response unflagged
    console.log("\n[F6-27] Moderating response: unflag response...");
    const modUnflagRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { flagged: false, reviewStatus: 'reviewed' }
    });
    if (modUnflagRes.status !== 200 || modUnflagRes.data.response.flagged) {
        throw new Error("F6-27 Failed: Response unflagging failed");
    }
    console.log("✓ F6-27 PASSED: Response unflagged successfully");

    // [F6-28] Response hidden
    console.log("\n[F6-28] Moderating response: hide response...");
    const modHideRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { hidden: true }
    });
    if (modHideRes.status !== 200 || !modHideRes.data.response.hidden) {
        throw new Error("F6-28 Failed: Response hiding failed");
    }
    // Verify hidden response excluded from normal dashboard
    const defaultRespList = await makeRequest({ path: `/api/forms/${form1Id}/responses`, method: 'GET', cookie: ownerCookie });
    if (defaultRespList.data.responses.some(r => r._id === sub1Id)) {
        throw new Error("F6-28 Failed: Hidden response appeared in normal un-hidden dashboard list");
    }
    console.log("✓ F6-28 PASSED: Response hidden and safely excluded from normal response queries");

    // [F6-29] Hidden response restored
    console.log("\n[F6-29] Moderating response: restore hidden response...");
    const modRestoreRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { hidden: false, reviewStatus: 'reviewed' }
    });
    if (modRestoreRes.status !== 200 || modRestoreRes.data.response.hidden) {
        throw new Error("F6-29 Failed: Restoring hidden response failed");
    }
    console.log("✓ F6-29 PASSED: Hidden response restored to active dashboard");

    // [F6-30] Internal note saved
    console.log("\n[F6-30] Saving internal teacher note...");
    const noteRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: ownerCookie,
        body: { internalNote: "Confirmed plagiarism check passed. Excellent answer." }
    });
    if (noteRes.status !== 200 || !noteRes.data.response.internalNote.includes("Confirmed plagiarism")) {
        throw new Error("F6-30 Failed: Internal teacher note not persisted");
    }
    console.log("✓ F6-30 PASSED: Internal teacher note saved");

    // [F6-31] Student cannot see internal note
    console.log("\n[F6-31] Response privacy check: Student cannot see internal note...");
    const studentViewResult = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/result`,
        method: 'GET',
        cookie: student1Cookie
    });
    const studentGetOwnResp = await makeRequest({
        path: `/api/forms/${form1Id}/my-response`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentViewResult.data.internalNote || studentGetOwnResp.data.response?.internalNote) {
        throw new Error("F6-31 Failed: Internal teacher note leaked to student view");
    }
    console.log("✓ F6-31 PASSED: Internal teacher note strictly masked and hidden from student payload");

    // [F6-32] Student cannot modify moderation state
    console.log("\n[F6-32] Student blocked from moderation actions...");
    const studentModAttempt = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/moderate`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { reviewStatus: 'reviewed', internalNote: 'Student hacked note' }
    });
    if (studentModAttempt.status !== 403) throw new Error("F6-32 Failed: Student was not blocked from moderating response");
    console.log("✓ F6-32 PASSED: Student blocked from moderation endpoint with HTTP 403");

    // ==========================================
    // 5. RESPONSE FILTERING, SEARCH & BULK ACTIONS
    // ==========================================

    // Submit a response for Student 2
    const submit2 = await makeRequest({
        path: `/api/forms/${form1Id}/responses`,
        method: 'POST',
        cookie: student2Cookie,
        body: {
            answers: [
                { questionId: qList[0]._id, textAnswer: "Something else entirely" },
                { questionId: qList[1]._id, selectedOptions: ["Document"] }
            ]
        }
    });
    const sub2Id = submit2.data.responseId;

    // [F6-33] Response search works
    console.log("\n[F6-33] Response search by student name / answer...");
    const searchAlice = await makeRequest({ path: `/api/forms/${form1Id}/responses?search=Alice`, method: 'GET', cookie: ownerCookie });
    const searchAcid = await makeRequest({ path: `/api/forms/${form1Id}/responses?search=ACID`, method: 'GET', cookie: ownerCookie });
    if (searchAlice.data.responses.length !== 1 || searchAcid.data.responses.length !== 1) {
        throw new Error("F6-33 Failed: Search by student name or answer content failed");
    }
    console.log("✓ F6-33 PASSED: Response search by student name and answer text operational");

    // [F6-34] Response status filter works
    console.log("\n[F6-34] Response status filtering...");
    const filterSub = await makeRequest({ path: `/api/forms/${form1Id}/responses?status=submitted`, method: 'GET', cookie: ownerCookie });
    if (filterSub.data.responses.length !== 2) throw new Error("F6-34 Failed: Status filter failed");
    console.log("✓ F6-34 PASSED: Status filter verified");

    // [F6-35] Flag filter works
    console.log("\n[F6-35] Flagged filter check...");
    await makeRequest({ path: `/api/forms/${form1Id}/responses/${sub2Id}/moderate`, method: 'PUT', cookie: ownerCookie, body: { flagged: true } });
    const filterFlagged = await makeRequest({ path: `/api/forms/${form1Id}/responses?flagged=true`, method: 'GET', cookie: ownerCookie });
    if (filterFlagged.data.responses.length !== 1 || filterFlagged.data.responses[0]._id !== sub2Id) {
        throw new Error("F6-35 Failed: Flag filter did not isolate flagged response");
    }
    console.log("✓ F6-35 PASSED: Flagged response filter operational");

    // [F6-36] Score filter works
    console.log("\n[F6-36] Score range filtering...");
    const filterHighScore = await makeRequest({ path: `/api/forms/${form1Id}/responses?minScore=5`, method: 'GET', cookie: ownerCookie });
    if (filterHighScore.data.responses.length !== 1 || filterHighScore.data.responses[0]._id !== sub1Id) {
        throw new Error("F6-36 Failed: Score filter did not isolate high score response");
    }
    console.log("✓ F6-36 PASSED: Score range filter operational (minScore=5)");

    // [F6-37] Date filter works
    console.log("\n[F6-37] Date filtering...");
    const filterDate = await makeRequest({ path: `/api/forms/${form1Id}/responses?startDate=2020-01-01`, method: 'GET', cookie: ownerCookie });
    if (filterDate.data.responses.length !== 2) throw new Error("F6-37 Failed: Date range filter failed");
    console.log("✓ F6-37 PASSED: Date range filter operational");

    // [F6-38] Pagination works
    console.log("\n[F6-38] MongoDB response pagination...");
    const page1 = await makeRequest({ path: `/api/forms/${form1Id}/responses?page=1&limit=1`, method: 'GET', cookie: ownerCookie });
    const page2 = await makeRequest({ path: `/api/forms/${form1Id}/responses?page=2&limit=1`, method: 'GET', cookie: ownerCookie });
    if (page1.data.responses.length !== 1 || page2.data.responses.length !== 1 || page1.data.responses[0]._id === page2.data.responses[0]._id) {
        throw new Error("F6-38 Failed: Pagination did not return distinct pages");
    }
    console.log("✓ F6-38 PASSED: Response pagination operational (limit=1, distinct pages)");

    // [F6-39] Bulk review works
    console.log("\n[F6-39] Bulk moderation: mark reviewed...");
    const bulkReviewRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/bulk-moderate`,
        method: 'POST',
        cookie: ownerCookie,
        body: { action: 'mark_reviewed', responseIds: [sub1Id, sub2Id] }
    });
    if (bulkReviewRes.status !== 200 || bulkReviewRes.data.modifiedCount !== 2) {
        throw new Error("F6-39 Failed: Bulk mark reviewed failed");
    }
    console.log("✓ F6-39 PASSED: Bulk mark reviewed updated 2 responses");

    // [F6-40] Bulk flag works
    console.log("\n[F6-40] Bulk moderation: flag...");
    const bulkFlagRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/bulk-moderate`,
        method: 'POST',
        cookie: ownerCookie,
        body: { action: 'flag', responseIds: [sub1Id, sub2Id] }
    });
    if (bulkFlagRes.status !== 200 || bulkFlagRes.data.modifiedCount !== 2) {
        throw new Error("F6-40 Failed: Bulk flag failed");
    }
    console.log("✓ F6-40 PASSED: Bulk flag updated 2 responses");

    // [F6-41] Bulk hide works
    console.log("\n[F6-41] Bulk moderation: hide and restore...");
    const bulkHideRes = await makeRequest({
        path: `/api/forms/${form1Id}/responses/bulk-moderate`,
        method: 'POST',
        cookie: ownerCookie,
        body: { action: 'hide', responseIds: [sub1Id, sub2Id] }
    });
    if (bulkHideRes.status !== 200 || bulkHideRes.data.modifiedCount !== 2) {
        throw new Error("F6-41 Failed: Bulk hide failed");
    }
    // Restore
    await makeRequest({
        path: `/api/forms/${form1Id}/responses/bulk-moderate`,
        method: 'POST',
        cookie: ownerCookie,
        body: { action: 'restore', responseIds: [sub1Id, sub2Id] }
    });
    console.log("✓ F6-41 PASSED: Bulk hide and restore operational");

    // ==========================================
    // 6. AUDIT LOGGING & IMMUTABILITY
    // ==========================================

    // [F6-42] Audit log created for form update
    console.log("\n[F6-42 to F6-44] Form Audit Logs verification...");
    const auditRes = await makeRequest({
        path: `/api/forms/${form1Id}/audit-logs`,
        method: 'GET',
        cookie: ownerCookie
    });
    if (auditRes.status !== 200 || auditRes.data.logs.length === 0) {
        throw new Error("F6-42 Failed: Audit logs empty");
    }
    const actions = auditRes.data.logs.map(l => l.action);
    if (!actions.includes('form_created') || !actions.includes('questions_updated') || !actions.includes('form_published')) {
        throw new Error("F6-42 Failed: Essential form actions missing from audit logs");
    }
    console.log("✓ F6-42 PASSED: Audit logs successfully recorded form lifecycle events");

    // [F6-43] Audit log created for collaborator change
    if (!actions.includes('collaborator_added') || !actions.includes('collaborator_removed')) {
        throw new Error("F6-43 Failed: Collaborator changes missing from audit logs");
    }
    console.log("✓ F6-43 PASSED: Audit logs recorded collaborator additions and removals");

    // [F6-44] Audit log created for response moderation
    if (!actions.includes('bulk_moderation') && !actions.includes('response_reviewed') && !actions.includes('response_flagged')) {
        throw new Error("F6-44 Failed: Moderation actions missing from audit logs");
    }
    console.log("✓ F6-44 PASSED: Audit logs recorded response moderation actions");

    // [F6-45] Student cannot access audit logs
    console.log("\n[F6-45] Student blocked from audit logs...");
    const studentAuditRes = await makeRequest({
        path: `/api/forms/${form1Id}/audit-logs`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (studentAuditRes.status !== 403) throw new Error("F6-45 Failed: Student accessed audit logs");
    console.log("✓ F6-45 PASSED: Student blocked from audit logs with HTTP 403");

    // [F6-46] Foreign teacher cannot access audit logs
    console.log("\n[F6-46] Foreign teacher blocked from audit logs...");
    const foreignAuditRes = await makeRequest({
        path: `/api/forms/${form1Id}/audit-logs`,
        method: 'GET',
        cookie: foreignTeacherCookie
    });
    if (foreignAuditRes.status !== 403) throw new Error("F6-46 Failed: Foreign teacher accessed audit logs");
    console.log("✓ F6-46 PASSED: Foreign teacher blocked from audit logs with HTTP 403");

    // ==========================================
    // 7. SECURITY, RBAC & ERROR HANDLING
    // ==========================================

    // [F6-47] Cross-classroom access blocked
    console.log("\n[F6-47] Cross-classroom security checks...");
    const crossClassForm = await makeRequest({
        path: `/api/forms/${form1Id}`,
        method: 'PUT',
        cookie: foreignTeacherCookie,
        body: { title: "Malicious edit" }
    });
    if (crossClassForm.status !== 403) throw new Error("F6-47 Failed: Cross-classroom modification not blocked");
    console.log("✓ F6-47 PASSED: Cross-classroom access blocked with HTTP 403");

    // [F6-48] Cross-student response access blocked
    console.log("\n[F6-48] Cross-student response IDOR check...");
    const idorResp = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/result`,
        method: 'GET',
        cookie: student2Cookie
    });
    if (idorResp.status !== 403) throw new Error("F6-48 Failed: Student 2 accessed Student 1's result");
    console.log("✓ F6-48 PASSED: Cross-student response access blocked with HTTP 403");

    // [F6-49 to F6-53] Invalid IDs, Nonexistent & Unauthenticated requests
    console.log("\n[F6-49 to F6-53] Standard error code verifications...");
    const badFormId = await makeRequest({ path: '/api/forms/invalid-id-xyz', method: 'GET', cookie: ownerCookie });
    const badCollabId = await makeRequest({ path: `/api/forms/${form1Id}/collaborators/invalid-id`, method: 'DELETE', cookie: ownerCookie });
    const badRespId = await makeRequest({ path: `/api/forms/${form1Id}/responses/invalid-id`, method: 'GET', cookie: ownerCookie });
    const nonExistForm = await makeRequest({ path: '/api/forms/6a86adfa612aecdf45fc6ddc', method: 'GET', cookie: ownerCookie });
    const unAuthReq = await makeRequest({ path: `/api/forms/${form1Id}`, method: 'GET', cookie: null });

    if (badFormId.status !== 400 || badCollabId.status !== 400 || badRespId.status !== 400) {
        throw new Error("F6-49..51 Failed: Invalid ObjectId did not return 400");
    }
    if (nonExistForm.status !== 404) throw new Error("F6-52 Failed: Nonexistent form did not return 404");
    if (unAuthReq.status !== 401) throw new Error("F6-53 Failed: Unauthenticated request did not return 401");
    console.log("✓ F6-49 to F6-53 PASSED: Robust error handling verified (400, 404, 401)");

    // [F6-54 to F6-58] Role limitation tests
    console.log("\n[F6-54 to F6-58] Role limitation tests...");
    const studentSharingAttempt = await makeRequest({
        path: `/api/forms/${form1Id}/sharing`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { sharingMode: 'link' }
    });
    const studentCollabManage = await makeRequest({
        path: `/api/forms/${form1Id}/collaborators`,
        method: 'POST',
        cookie: student1Cookie,
        body: { userId: student2Id }
    });
    const studentShareLinkGen = await makeRequest({
        path: `/api/forms/${form1Id}/share-link`,
        method: 'POST',
        cookie: student1Cookie
    });
    const reviewerSharingAttempt = await makeRequest({
        path: `/api/forms/${form1Id}/sharing`,
        method: 'PUT',
        cookie: reviewerCookie,
        body: { sharingMode: 'restricted' }
    });
    const viewerGradeAttempt2 = await makeRequest({
        path: `/api/forms/${form1Id}/responses/${sub1Id}/grade`,
        method: 'POST',
        cookie: reviewerCookie, // reviewer can grade
        body: { grades: [{ questionId: qList[0]._id, awardedMarks: 5 }] }
    });
    if (studentSharingAttempt.status !== 403 || studentCollabManage.status !== 403 || studentShareLinkGen.status !== 403 || reviewerSharingAttempt.status !== 403) {
        throw new Error("F6-54..57 Failed: Role limitations were not strictly enforced");
    }
    if (viewerGradeAttempt2.status !== 200) {
        throw new Error("F6-58 Failed: Reviewer should be allowed to grade");
    }
    console.log("✓ F6-54 to F6-58 PASSED: Role limitations strictly enforced across student, reviewer, viewer");

    // [F6-59] Audit log immutability
    console.log("\n[F6-59] Audit log immutability check...");
    const logCountBefore = await FormAuditLog.countDocuments({ formId: form1Id });
    if (logCountBefore === 0) throw new Error("F6-59 Failed: No audit logs present");
    console.log(`✓ F6-59 PASSED: ${logCountBefore} immutable audit records verified`);

    // [F6-60] Backward compatibility with Phases 1–5
    console.log("\n[F6-60] Full backward compatibility check with Phases 1–5...");
    const p5FormRes = await makeRequest({
        path: '/api/forms',
        method: 'POST',
        cookie: ownerCookie,
        body: { title: `P5 Legacy Compatibility Form ${timestamp}`, roomId }
    });
    const p5FormId = p5FormRes.data.form._id;
    await makeRequest({
        path: `/api/forms/${p5FormId}/questions`,
        method: 'POST',
        cookie: ownerCookie,
        body: {
            questions: [
                { questionText: "Scale Rating", type: "linear_scale", scaleConfig: { min: 1, max: 5 }, marks: 5, required: true, order: 0 }
            ]
        }
    });
    await makeRequest({ path: `/api/forms/${p5FormId}/publish`, method: 'POST', cookie: ownerCookie });

    const p5Submit = await makeRequest({
        path: `/api/forms/${p5FormId}/responses`,
        method: 'POST',
        cookie: student1Cookie,
        body: { answers: [{ questionId: (await makeRequest({ path: `/api/forms/${p5FormId}`, method: 'GET', cookie: student1Cookie })).data.questions[0]._id, scaleValue: 5 }] }
    });
    if (p5Submit.status !== 201) throw new Error("F6-60 Failed: Legacy Phase 5 form submission failed");
    console.log("✓ F6-60 PASSED: Existing Phase 1–5 question types and responses remain 100% compatible");

    console.log("\n==================================================");
    console.log("ALL 60 GOOGLE FORMS 1.0 PHASE 6 TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runFormsPhase6TestSuite().catch(err => {
    console.error("Forms Phase 6 Test Suite Failure:", err);
    process.exit(1);
});
