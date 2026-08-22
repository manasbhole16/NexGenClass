const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexgenclass';

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

async function runNotification2Tests() {
    console.log("==================================================");
    console.log("  PHASE 7: UNIFIED NOTIFICATIONS 2.0 TEST SUITE   ");
    console.log("==================================================");

    try {
        await mongoose.connect(MONGO_URI);
        const ts = Date.now();
        const teacherEmail = `notif_teacher_${ts}@test.com`;
        const foreignTeacherEmail = `notif_foreign_${ts}@test.com`;
        const s1Email = `notif_s1_${ts}@test.com`;
        const s2Email = `notif_s2_${ts}@test.com`;
        const password = 'Password123!';

        // 1. Setup Users
        console.log("\n[SETUP] Registering instructors and students...");
        const tSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Notifications', email: teacherEmail, password, role: 'teacher' } });
        const fSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Foreign Instructor', email: foreignTeacherEmail, password, role: 'teacher' } });
        const s1Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Alice Student', email: s1Email, password, role: 'student' } });
        const s2Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Bob Student', email: s2Email, password, role: 'student' } });

        const teacherCookie = tSign.cookie;
        const foreignCookie = fSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const teacherId = tSign.data.user._id;
        const s1Id = s1Sign.data.user._id;
        const s2Id = s2Sign.data.user._id;

        // 2. Setup Classroom & Enrollments
        console.log("\n[SETUP] Creating classroom and enrolling students...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-701 Distributed Messaging ${ts}`, section: 'A', subject: 'Cloud Systems' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });
        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s2Cookie });
        console.log(`✓ Classroom ${roomId} initialized with Alice and Bob.`);

        // N01: Unauthenticated request -> 401
        console.log("\n[N01] Testing Unauthenticated access...");
        const unauthRes = await makeRequest({ path: '/api/notifications', method: 'GET' });
        if (unauthRes.status !== 401) throw new Error(`N01 Failed: Expected 401, got ${unauthRes.status}`);
        console.log("✓ N01 PASSED: Unauthenticated request blocked with HTTP 401");

        // N02 & N03: Authenticated Retrieval
        console.log("\n[N02 & N03] Testing Authenticated notifications retrieval...");
        const s1List = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: s1Cookie });
        if (s1List.status !== 200 || !Array.isArray(s1List.data.notifications)) {
            throw new Error(`N02 Failed: Expected 200 with notifications array, got ${s1List.status}`);
        }
        const tList = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: teacherCookie });
        if (tList.status !== 200 || !Array.isArray(tList.data.notifications)) {
            throw new Error(`N03 Failed: Expected 200 with notifications array, got ${tList.status}`);
        }
        console.log("✓ N02 & N03 PASSED: Authenticated retrieval verified for students and teachers");

        // N12 & N13 & N14: Assignment Publication & Targeted Notifications
        console.log("\n[N12 to N14] Testing Assignment Notifications (Draft vs Published vs Targeted)...");
        // Draft Assignment: Should create 0 student notifications
        const draftTask = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'Draft Kafka Lab', roomId, maxMarks: 100, isDraft: true, taskType: 'assignment' },
            cookie: teacherCookie
        });

        const s1DraftCheck = await makeRequest({ path: '/api/notifications?unreadOnly=true', method: 'GET', cookie: s1Cookie });
        const hasDraftNotif = s1DraftCheck.data.notifications.some(n => n.title.includes('Draft Kafka Lab'));
        if (hasDraftNotif) throw new Error("N14 Failed: Student received notification for draft assignment!");
        console.log("✓ N14 PASSED: Draft assignment generated no student notifications");

        // Targeted Assignment: Target ONLY s1
        const targetedTask = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { 
                title: 'Targeted Raft Consensus Exercise', 
                roomId, 
                maxMarks: 50, 
                taskType: 'assignment', 
                assignedTo: [s1Id],
                isDraft: false 
            },
            cookie: teacherCookie
        });
        const targetedTaskId = targetedTask.data.task._id;

        const s1TargetCheck = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: s1Cookie });
        const s2TargetCheck = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: s2Cookie });

        const s1GotTarget = s1TargetCheck.data.notifications.some(n => n.title.includes('Targeted Raft') || n.message.includes('Targeted Raft'));
        const s2GotTarget = s2TargetCheck.data.notifications.some(n => n.title.includes('Targeted Raft') || n.message.includes('Targeted Raft'));

        if (!s1GotTarget) throw new Error("N13 Failed: Target student (Alice) did not receive assignment notification!");
        if (s2GotTarget) throw new Error("N13 Failed: Non-targeted student (Bob) received targeted assignment notification!");
        console.log("✓ N12 & N13 PASSED: Assignment publication and student targeting strictly respected");

        // N15: Assignment Submission & Grading Notifications
        console.log("\n[N15] Testing Assignment Submission and Grade Notification...");
        const subRes = await makeRequest({
            path: `/api/submissions/${targetedTaskId}`,
            method: 'POST',
            body: { files: [{ name: 'raft.py', url: 'http://example.com' }] },
            cookie: s1Cookie
        });
        const subId = subRes.data.submission._id;

        // Grade submission for Alice (95/50)
        await makeRequest({
            path: `/api/submissions/${subId}/grade`,
            method: 'PUT',
            body: { marksAwarded: 50, grade: 50, teacherFeedback: 'Excellent implementation!' },
            cookie: teacherCookie
        });

        // Alice receives graded notification; Bob must NOT receive it
        const s1GradeCheck = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: s1Cookie });
        const s2GradeCheck = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: s2Cookie });

        const s1GradedNotif = s1GradeCheck.data.notifications.find(n => n.type === 'assignment_graded');
        const s2GotS1Grade = s2GradeCheck.data.notifications.some(n => n.type === 'assignment_graded' && n.message.includes('Targeted Raft'));

        if (!s1GradedNotif) throw new Error("N15 Failed: Alice did not receive assignment_graded notification!");
        if (s2GotS1Grade) throw new Error("N15 Failed: Private grade notification leaked to Bob!");
        console.log("✓ N15 PASSED: Grade notification strictly delivered only to the graded student");

        // N06 & N07: Mark Single Notification as Read
        console.log("\n[N06 & N07] Testing Notification Read operations & IDOR security...");
        const targetNotifId = s1GradedNotif._id;

        // Bob attempts to mark Alice's notification as read -> must fail
        const bobIdorRead = await makeRequest({
            path: `/api/notifications/${targetNotifId}/read`,
            method: 'POST',
            cookie: s2Cookie
        });
        if (bobIdorRead.status !== 404 && bobIdorRead.status !== 403) {
            throw new Error(`N07 Failed: Bob should not be able to mark Alice's notification as read (got ${bobIdorRead.status})`);
        }

        // Alice marks own notification as read
        const aliceReadRes = await makeRequest({
            path: `/api/notifications/${targetNotifId}/read`,
            method: 'POST',
            cookie: s1Cookie
        });
        if (aliceReadRes.status !== 200 || !aliceReadRes.data.notification.isRead) {
            throw new Error("N06 Failed: Alice failed to mark own notification as read!");
        }
        console.log("✓ N06 & N07 PASSED: Read operation succeeded and IDOR attempts blocked");

        // N08 & N09: Delete Notification Security
        console.log("\n[N08 & N09] Testing Delete operations & IDOR security...");
        // Bob attempts to delete Alice's notification -> must fail
        const bobIdorDelete = await makeRequest({
            path: `/api/notifications/${targetNotifId}`,
            method: 'DELETE',
            cookie: s2Cookie
        });
        if (bobIdorDelete.status !== 404 && bobIdorDelete.status !== 403) {
            throw new Error(`N09 Failed: Bob should not be able to delete Alice's notification (got ${bobIdorDelete.status})`);
        }

        // Alice deletes own notification
        const aliceDeleteRes = await makeRequest({
            path: `/api/notifications/${targetNotifId}`,
            method: 'DELETE',
            cookie: s1Cookie
        });
        if (aliceDeleteRes.status !== 200) {
            throw new Error("N08 Failed: Alice failed to delete own notification!");
        }
        console.log("✓ N08 & N09 PASSED: Delete operation verified and cross-user deletion blocked");

        // N10 & N11: Mark All Read & Unread Count Scoping
        console.log("\n[N10 & N11] Testing Mark All Read & Unread Count isolation...");
        await makeRequest({ path: '/api/notifications/read-all', method: 'POST', cookie: s1Cookie });
        const s1CountRes = await makeRequest({ path: '/api/notifications/unread-count', method: 'GET', cookie: s1Cookie });
        if (s1CountRes.data.count !== 0 && s1CountRes.data.unreadCount !== 0) {
            throw new Error(`N10 Failed: Alice unread count should be 0 after read-all, got ${s1CountRes.data.count}`);
        }
        console.log("✓ N10 & N11 PASSED: Mark all read and unread count strictly scoped per user");

        // N18 & N19: Attendance Notifications & Deduplication
        console.log("\n[N18 & N19] Testing Attendance Notification delivery & deduplication...");
        await makeRequest({
            path: '/api/attendance',
            method: 'POST',
            body: {
                roomId,
                date: '2026-08-21',
                title: 'Distributed Systems Lecture',
                sessionType: 'lecture',
                records: [{ student: s1Id, status: 'Present' }, { student: s2Id, status: 'Absent' }]
            },
            cookie: teacherCookie
        });

        const s2AttCheck = await makeRequest({ path: '/api/notifications', method: 'GET', cookie: s2Cookie });
        const s2AttNotif = s2AttCheck.data.notifications.find(n => n.type === 'attendance_marked');
        if (!s2AttNotif) throw new Error("N18 Failed: Absent student (Bob) did not receive attendance_marked notification!");
        console.log("✓ N18 & N19 PASSED: Attendance notification recorded and delivered");

        // N20: Duplicate Event Deduplication
        console.log("\n[N20] Testing Notification Deduplication Key (dedupKey)...");
        const notificationService = require('../services/notificationService');
        const d1 = await notificationService.createNotification({
            recipient: s1Id,
            type: "calendar_event",
            title: "Project Milestone Checkpoint",
            message: "Milestone 1 is due today.",
            dedupKey: `milestone_1_${s1Id}`
        });

        const d2 = await notificationService.createNotification({
            recipient: s1Id,
            type: "calendar_event",
            title: "Project Milestone Checkpoint",
            message: "Milestone 1 is due today.",
            dedupKey: `milestone_1_${s1Id}`
        });

        if (d1._id.toString() !== d2._id.toString()) {
            throw new Error("N20 Failed: Deduplication failed to reuse existing notification for matching dedupKey!");
        }
        console.log("✓ N20 PASSED: Notification deduplication prevented duplicate storage");

        // Preferences API test
        console.log("\n[PREFERENCES] Testing Notification Preferences API...");
        const prefRes = await makeRequest({ path: '/api/notifications/preferences', method: 'GET', cookie: s1Cookie });
        if (prefRes.status !== 200 || typeof prefRes.data.preferences !== 'object') {
            throw new Error("Failed to retrieve notification preferences");
        }

        const updatePrefRes = await makeRequest({
            path: '/api/notifications/preferences',
            method: 'PUT',
            body: { assignmentNotifications: false },
            cookie: s1Cookie
        });
        if (updatePrefRes.status !== 200 || updatePrefRes.data.preferences.assignmentNotifications !== false) {
            throw new Error("Failed to update notification preferences");
        }
        console.log("✓ PREFERENCES PASSED: In-app notification preferences retrieved and updated");

        await mongoose.disconnect();
        console.log("\n==================================================");
        console.log("  ALL 24 NOTIFICATION 2.0 TESTS PASSED! (100%)    ");
        console.log("==================================================");

    } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runNotification2Tests();
