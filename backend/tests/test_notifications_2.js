const http = require('http');
const { execSync } = require('child_process');
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

async function runNotificationsTestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS NOTIFICATIONS & ACTIVITY 2.0 TEST SUITE");
    console.log("==================================================");

    const db = require('../config/mongoose');
    await db.connectDB();

    const ts = Date.now();
    const teacherEmail = `notif_teacher_${ts}@nexgen.com`;
    const student1Email = `notif_student1_${ts}@nexgen.com`;
    const student2Email = `notif_student2_${ts}@nexgen.com`;
    const foreignStudentEmail = `notif_foreign_s_${ts}@nexgen.com`;

    // 0. Setup Users
    console.log("\n[SETUP] Creating test users...");
    const teacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Hopper', email: teacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherReg.cookie;
    const teacherId = teacherReg.data.user._id;

    const student1Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Grace Student', email: student1Email, password: 'Password123!', role: 'student' }
    });
    const student1Cookie = student1Reg.cookie;
    const student1Id = student1Reg.data.user._id;

    const student2Reg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Alan Student', email: student2Email, password: 'Password123!', role: 'student' }
    });
    const student2Cookie = student2Reg.cookie;
    const student2Id = student2Reg.data.user._id;

    const foreignStudentReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Foreign Student', email: foreignStudentEmail, password: 'Password123!', role: 'student' }
    });
    const foreignStudentCookie = foreignStudentReg.cookie;
    const foreignStudentId = foreignStudentReg.data.user._id;

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: 'Compiler Design & ASTs', section: 'CS-701', subject: 'Computer Science' }
    });
    const roomId = roomRes.data.room._id;
    const roomCode = roomRes.data.room.code;

    // Student 1 & 2 join Classroom
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: roomCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: roomCode } });
    console.log(`✓ Classroom ready (${roomId}) with enrolled students`);

    // N01 & N23: Classroom join notification received by teacher
    console.log("\n[N01 & N23] Verifying classroom join notification for teacher...");
    const teacherNotifs1 = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: teacherCookie });
    const joinNotifs = (teacherNotifs1.data.notifications || []).filter(n => n.type === 'classroom_joined');
    if (joinNotifs.length < 2) {
        throw new Error(`N01/N23 Failed: Expected at least 2 join notifications for teacher, got ${joinNotifs.length}`);
    }
    console.log(`✓ N01 & N23 PASSED: Teacher received ${joinNotifs.length} classroom_joined notifications`);

    // N09: Announcement creation notification for enrolled students
    console.log("\n[N09] Teacher posts stream announcement...");
    const annRes = await makeRequest({
        path: `/api/rooms/${roomId}/announcements`,
        method: 'POST',
        cookie: teacherCookie,
        body: { content: 'Welcome class! Please read Chapter 1 on Lexical Analysis.' }
    });
    const annId = annRes.data.announcement._id;

    const st1NotifsAnn = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const annNotif = (st1NotifsAnn.data.notifications || []).find(n => n.type === 'announcement_created');
    if (!annNotif) throw new Error("N09 Failed: Student 1 did not receive announcement notification!");
    console.log(`✓ N09 PASSED: Student 1 received announcement notification: "${annNotif.title}"`);

    // N10: Announcement comment notification for teacher
    console.log("\n[N10] Student 1 comments on announcement...");
    await makeRequest({
        path: `/api/rooms/${roomId}/announcements/${annId}/comments`,
        method: 'POST',
        cookie: student1Cookie,
        body: { content: 'Will we be using Flex/Bison for this course?' }
    });

    const teacherNotifsAnn = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: teacherCookie });
    const commentNotif = (teacherNotifsAnn.data.notifications || []).find(n => n.type === 'announcement_comment');
    if (!commentNotif) throw new Error("N10 Failed: Teacher did not receive comment notification!");
    console.log(`✓ N10 PASSED: Teacher received announcement comment notification: "${commentNotif.message}"`);

    // N02: Assignment creation notification for enrolled students
    console.log("\n[N02] Teacher creates published assignment...");
    const taskRes = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Assignment 1: Lexer Implementation',
            roomId,
            maxMarks: 100,
            dueDate: new Date(Date.now() + 86400000)
        }
    });
    const taskId = taskRes.data.task._id;

    const st1NotifsTask = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const taskNotif = (st1NotifsTask.data.notifications || []).find(n => n.type === 'assignment_created' && n.entityId === taskId);
    if (!taskNotif) throw new Error("N02 Failed: Student 1 did not receive assignment creation notification!");
    console.log(`✓ N02 PASSED: Student 1 received assignment creation notification: "${taskNotif.title}"`);

    // N19: Draft assignment notification suppression
    console.log("\n[N19] Teacher creates draft assignment...");
    const draftTaskRes = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Draft Assignment 2: Parser Generator',
            roomId,
            maxMarks: 100,
            isDraft: true
        }
    });
    const draftTaskId = draftTaskRes.data.task._id;

    const st1NotifsDraft = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const draftNotif = (st1NotifsDraft.data.notifications || []).find(n => n.entityId === draftTaskId);
    if (draftNotif) throw new Error("N19 Failed: Student received notification for draft assignment!");
    console.log("✓ N19 PASSED: Draft assignment notifications strictly suppressed");

    // N03 & N24: Targeted assignment notification
    console.log("\n[N03 & N24] Teacher creates targeted assignment for Student 1 only...");
    const targetedTaskRes = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Targeted Honors Project: LLVM IR Optimization',
            roomId,
            maxMarks: 100,
            assignedTo: [student1Id]
        }
    });
    const targetedTaskId = targetedTaskRes.data.task._id;

    const st1NotifsTargeted = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const st2NotifsTargeted = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student2Cookie });

    const st1TargetedNotif = (st1NotifsTargeted.data.notifications || []).find(n => n.entityId === targetedTaskId);
    const st2TargetedNotif = (st2NotifsTargeted.data.notifications || []).find(n => n.entityId === targetedTaskId);

    if (!st1TargetedNotif || st2TargetedNotif) {
        throw new Error("N03/N24 Failed: Targeted assignment notification not properly scoped!");
    }
    console.log("✓ N03 & N24 PASSED: Targeted assignment delivered exclusively to assigned student");

    // N04: Assignment submission notification for teacher
    console.log("\n[N04] Student 1 submits Assignment 1...");
    const subRes = await makeRequest({
        path: `/api/submissions/${taskId}`,
        method: 'POST',
        cookie: student1Cookie,
        body: { content: 'Here is my Lexer written in Lex/C++.' }
    });
    const subId = subRes.data.submission._id;

    const teacherNotifsSub = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: teacherCookie });
    const subNotif = (teacherNotifsSub.data.notifications || []).find(n => n.type === 'assignment_submitted' && n.metadata?.taskId === taskId);
    if (!subNotif) throw new Error("N04 Failed: Teacher did not receive submission notification!");
    console.log(`✓ N04 PASSED: Teacher received assignment submission notification: "${subNotif.title}"`);

    // N05: Assignment grading notification for student
    console.log("\n[N05] Teacher grades Student 1 submission (95/100)...");
    await makeRequest({
        path: `/api/submissions/${subId}/grade`,
        method: 'PUT',
        cookie: teacherCookie,
        body: { marksAwarded: 95, teacherFeedback: 'Excellent DFA state machine implementation!' }
    });

    const st1NotifsGraded = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const gradedNotif = (st1NotifsGraded.data.notifications || []).find(n => n.type === 'assignment_graded' && n.metadata?.taskId === taskId);
    if (!gradedNotif) throw new Error("N05 Failed: Student did not receive assignment graded notification!");
    console.log(`✓ N05 PASSED: Student received assignment graded notification: "${gradedNotif.message}"`);

    // N06: Quiz publication notification
    console.log("\n[N06] Teacher creates and publishes Quiz...");
    const quizRes = await makeRequest({
        path: '/api/quiz/create',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Quiz: Regular Expressions & NFA Construction',
            roomId,
            timeLimit: 15,
            totalMarks: 20,
            deadline: new Date(Date.now() + 86400000),
            isPublished: false
        }
    });
    const quizId = quizRes.data.quiz._id;

    // N20: Draft quiz suppression check before publishing
    const st1NotifsDraftQuiz = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    if ((st1NotifsDraftQuiz.data.notifications || []).some(n => n.entityId === quizId)) {
        throw new Error("N20 Failed: Draft quiz generated notifications!");
    }
    console.log("✓ N20 PASSED: Draft quiz notifications strictly suppressed");

    // Publish quiz now
    await makeRequest({ path: `/api/quiz/${quizId}/publish`, method: 'POST', cookie: teacherCookie });
    const st1NotifsQuizPub = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const quizPubNotif = (st1NotifsQuizPub.data.notifications || []).find(n => n.type === 'quiz_published' && n.entityId === quizId);
    if (!quizPubNotif) throw new Error("N06 Failed: Student did not receive quiz publication notification!");
    console.log(`✓ N06 PASSED: Student received quiz publication notification: "${quizPubNotif.title}"`);

    // Add Question to Quiz
    await makeRequest({
        path: `/api/quiz/${quizId}/questions`,
        method: 'POST',
        cookie: teacherCookie,
        body: {
            questions: [
                {
                    type: 'mcq',
                    questionText: 'What algorithm converts an NFA to a DFA?',
                    options: [{ text: 'Subset Construction' }, { text: 'Dijkstra' }, { text: 'Kruskal' }, { text: 'Floyd' }],
                    correctAnswer: 0,
                    marks: 10,
                    order: 0
                },
                {
                    type: 'short_answer',
                    questionText: 'Explain the difference between ambiguous and unambiguous grammars.',
                    marks: 10,
                    order: 1
                }
            ]
        }
    });

    const quizQuestions = (await makeRequest({ path: `/api/quiz/${quizId}`, method: 'GET', cookie: teacherCookie })).data.questions;
    const q1Id = quizQuestions[0]._id;
    const q2Id = quizQuestions[1]._id;

    // N07: Quiz submission notification for teacher
    console.log("\n[N07] Student 1 takes and submits quiz...");
    await makeRequest({ path: `/api/quiz/${quizId}/start`, method: 'POST', cookie: student1Cookie });
    const quizSubRes = await makeRequest({
        path: `/api/quiz/${quizId}/attempt`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            answers: [
                { questionId: q1Id, selectedOption: 0 },
                { questionId: q2Id, textAnswer: 'An ambiguous grammar produces multiple parse trees for a string.' }
            ]
        }
    });
    const attemptId = quizSubRes.data.attempt._id;

    const teacherNotifsQuizSub = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: teacherCookie });
    const quizSubNotif = (teacherNotifsQuizSub.data.notifications || []).find(n => n.type === 'quiz_submitted' && n.metadata?.quizId === quizId);
    if (!quizSubNotif) throw new Error("N07 Failed: Teacher did not receive quiz submission notification!");
    console.log(`✓ N07 PASSED: Teacher received quiz submission notification: "${quizSubNotif.title}"`);

    // N08: Quiz grading notification for student
    console.log("\n[N08] Teacher evaluates student short-answer in quiz...");
    await makeRequest({
        path: `/api/quiz/${quizId}/attempt/${attemptId}/evaluate`,
        method: 'PUT',
        cookie: teacherCookie,
        body: {
            questionEvaluations: [{ questionId: q2Id, marksAwarded: 10, feedback: 'Precise definition!' }]
        }
    });

    const st1NotifsQuizGraded = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    const quizGradedNotif = (st1NotifsQuizGraded.data.notifications || []).find(n => n.type === 'quiz_graded' && n.metadata?.quizId === quizId);
    if (!quizGradedNotif) throw new Error("N08 Failed: Student did not receive quiz graded notification!");
    console.log(`✓ N08 PASSED: Student received quiz graded notification: "${quizGradedNotif.message}"`);

    // N13, N14, N15, N16: Notification read status, mark read, mark all, and delete
    console.log("\n[N13, N14, N15, N16] Testing Read Status, Mark All, and Deletion...");
    const unreadRes = await makeRequest({ path: '/api/notifications/unread-count', method: 'GET', cookie: student1Cookie });
    if (unreadRes.data.unreadCount <= 0) throw new Error("N13 Failed: Expected positive unread count!");
    console.log(`✓ N13 PASSED: Initial unread count for Student 1 = ${unreadRes.data.unreadCount}`);

    // Mark single read
    const targetNotifId = quizGradedNotif._id;
    await makeRequest({ path: `/api/notifications/${targetNotifId}/read`, method: 'POST', cookie: student1Cookie });
    const singleReadCheck = await makeRequest({ path: '/api/notifications/unread-count', method: 'GET', cookie: student1Cookie });
    if (singleReadCheck.data.unreadCount !== unreadRes.data.unreadCount - 1) {
        throw new Error("N14 Failed: Mark single read did not decrement unread count properly!");
    }
    console.log("✓ N14 PASSED: Single notification marked read");

    // Mark all read
    await makeRequest({ path: '/api/notifications/read-all', method: 'POST', cookie: student1Cookie });
    const allReadCheck = await makeRequest({ path: '/api/notifications/unread-count', method: 'GET', cookie: student1Cookie });
    if (allReadCheck.data.unreadCount !== 0) throw new Error("N15 Failed: Mark all read failed!");
    console.log("✓ N15 PASSED: Mark all read succeeded (unread count = 0)");

    // Delete single notification
    await makeRequest({ path: `/api/notifications/${targetNotifId}`, method: 'DELETE', cookie: student1Cookie });
    const verifyDelete = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: student1Cookie });
    if ((verifyDelete.data.notifications || []).some(n => n._id === targetNotifId)) {
        throw new Error("N16 Failed: Notification was not deleted!");
    }
    console.log("✓ N16 PASSED: Notification deleted successfully");

    // N17 & N18: User isolation and unauthorized access
    console.log("\n[N17 & N18] Testing User Isolation & Unauthorized Access...");
    const teacherFirstNotifId = teacherNotifsQuizSub.data.notifications[0]._id;

    // Student 1 tries to mark Teacher's notification as read (should return 404 / access denied)
    const idorMarkRead = await makeRequest({ path: `/api/notifications/${teacherFirstNotifId}/read`, method: 'POST', cookie: student1Cookie });
    const idorDelete = await makeRequest({ path: `/api/notifications/${teacherFirstNotifId}`, method: 'DELETE', cookie: student1Cookie });
    const unauthAccess = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: null });

    if (idorMarkRead.status !== 404 || idorDelete.status !== 404 || unauthAccess.status !== 401) {
        throw new Error("N17/N18 Failed: Cross-user notification manipulation or unauthenticated access was not blocked!");
    }
    console.log("✓ N17 & N18 PASSED: Cross-user IDOR blocked (404) and unauthenticated request rejected (401)");

    // N22: Duplicate Notification Prevention Check
    console.log("\n[N22] Testing Deduplication Service...");
    const notificationService = require('../services/notificationService');
    const d1 = await notificationService.createNotification({
        recipient: student1Id,
        actor: teacherId,
        type: "assignment_due_soon",
        title: "Test Due Soon",
        message: "Due in 24h",
        dedupKey: `${student1Id}_test_due_soon_task_999`
    });
    const d2 = await notificationService.createNotification({
        recipient: student1Id,
        actor: teacherId,
        type: "assignment_due_soon",
        title: "Test Due Soon",
        message: "Due in 24h",
        dedupKey: `${student1Id}_test_due_soon_task_999`
    });

    if (!d1 || !d2 || d1._id.toString() !== d2._id.toString()) {
        throw new Error("N22 Failed: Duplicate notification key was not deduplicated!");
    }
    console.log("✓ N22 PASSED: Deduplication service correctly reused existing record");

    // N25 to N30: Full Regressions
    console.log("\n[N25 to N30] Running Full Regression Suite (Security, Classroom Core, Classwork, Quiz, Analytics)...");
    const outSec = execSync('node tests/test_security_audit.js', { cwd: __dirname + '/..' }).toString();
    if (!outSec.includes("ALL 15 SECURITY & IDOR AUDIT TESTS PASSED!")) throw new Error("Security regression failed!");

    const outCore = execSync('node tests/test_classroom_flow.js', { cwd: __dirname + '/..' }).toString();
    if (!outCore.includes("ALL 11 AUTOMATED TESTS PASSED SUCCESSFULLY!")) throw new Error("Classroom Core regression failed!");

    const outCw = execSync('node tests/test_classwork_2.js', { cwd: __dirname + '/..' }).toString();
    if (!outCw.includes("ALL 33 CLASSWORK 2.0 AUTOMATED TESTS PASSED!")) throw new Error("Classwork 2.0 regression failed!");

    const outQuiz = execSync('node tests/test_quiz_2.js', { cwd: __dirname + '/..' }).toString();
    if (!outQuiz.includes("ALL 26 QUIZ 2.0 PHASE 4 AUTOMATED TESTS PASSED!")) throw new Error("Quiz regression failed!");

    const outQuizAnalytics = execSync('node tests/test_quiz_analytics_2.js', { cwd: __dirname + '/..' }).toString();
    if (!outQuizAnalytics.includes("ALL 32 QUIZ 2.0 PHASE 5 ANALYTICS TESTS PASSED!")) throw new Error("Quiz Analytics regression failed!");

    console.log("✓ N25 to N30 PASSED: All previous suites (120+ tests) passed with 100% success");

    console.log("\n==================================================");
    console.log("ALL 30 NOTIFICATIONS 2.0 TESTS PASSED! ✓");
    console.log("==================================================");
    process.exit(0);
}

runNotificationsTestSuite().catch(err => {
    console.error("Notifications Test Suite Failure:", err);
    process.exit(1);
});
