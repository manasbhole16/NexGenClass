const mongoose = require('mongoose');
const User = require('../models/user-model');
const Room = require('../models/room-model');
const Task = require('../models/task-model');
const Submission = require('../models/submission-model');
const Attendance = require('../models/attendance-model');
const Announcement = require('../models/announcement-model');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

async function runTestSuite() {
    console.log("==================================================");
    console.log("NEXGENCLASS CLASSWORK 2.0 COMPREHENSIVE TEST SUITE");
    console.log("==================================================");

    const ts = Date.now();
    const teacherEmail = `cw2_teacher_${ts}@nexgen.com`;
    const student1Email = `cw2_student1_${ts}@nexgen.com`;
    const student2Email = `cw2_student2_${ts}@nexgen.com`;

    // 0. Setup Teacher & Students
    console.log("\n[SETUP] Creating test users...");
    const teacherReg = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: { fullname: 'Prof. Classwork', email: teacherEmail, password: 'Password123!', role: 'teacher' }
    });
    const teacherCookie = teacherReg.cookie;
    const teacherId = teacherReg.data.user._id;

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

    // Create Classroom
    const roomRes = await makeRequest({
        path: '/api/rooms/create',
        method: 'POST',
        cookie: teacherCookie,
        body: { name: 'Distributed Systems & Cloud', section: 'CS-500', subject: 'Computer Science' }
    });
    const roomId = roomRes.data.room._id;
    const roomCode = roomRes.data.room.code;

    // Students Join Classroom
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student1Cookie, body: { code: roomCode } });
    await makeRequest({ path: '/api/rooms/join', method: 'POST', cookie: student2Cookie, body: { code: roomCode } });
    console.log(`✓ Classroom ready (${roomId}) with 2 enrolled students`);

    // TC01: Teacher creates classroom assignment → 201
    console.log("\n[TC01] Teacher creates classroom assignment...");
    const tc01 = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Project Milestone 1: Distributed Cache',
            description: 'Implement a Redis-compatible key-value cache.',
            roomId,
            maxMarks: 100,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    });
    if (tc01.status !== 201) throw new Error(`TC01 Failed with status ${tc01.status}`);
    const assignment1Id = tc01.data.task._id;
    console.log(`✓ TC01 PASSED: Created assignment ${assignment1Id} (Status: 201)`);

    // Student 2 creates a preliminary submission on assignment 1
    const initialSubRes = await makeRequest({
        path: `/api/submissions/${assignment1Id}`,
        method: 'POST',
        cookie: student2Cookie,
        body: { roomId, content: 'Initial submission' }
    });
    const initialSubId = initialSubRes.data.submission._id;

    // TC02: Student attempts classroom assignment creation → 403
    console.log("\n[TC02] Student attempts classroom assignment creation (RBAC)...");
    const tc02 = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: student1Cookie,
        body: { title: 'Unauthorized Hack Task', roomId }
    });
    if (tc02.status !== 403) throw new Error(`TC02 Failed! Expected 403, got ${tc02.status}`);
    console.log(`✓ TC02 PASSED: Student creation blocked with HTTP 403`);

    // TC03: Student attempts assignment deletion → 403
    console.log("\n[TC03] Student attempts assignment deletion (RBAC)...");
    const tc03 = await makeRequest({
        path: `/api/tasks/${assignment1Id}`,
        method: 'DELETE',
        cookie: student1Cookie
    });
    if (tc03.status !== 403) throw new Error(`TC03 Failed! Expected 403, got ${tc03.status}`);
    console.log(`✓ TC03 PASSED: Student delete blocked with HTTP 403`);

    // TC04: Student attempts assignment modification → 403
    console.log("\n[TC04] Student attempts assignment modification (RBAC)...");
    const tc04 = await makeRequest({
        path: `/api/tasks/${assignment1Id}`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { title: 'Hacked Title' }
    });
    if (tc04.status !== 403) throw new Error(`TC04 Failed! Expected 403, got ${tc04.status}`);
    console.log(`✓ TC04 PASSED: Student update blocked with HTTP 403`);

    // TC05: Student attempts to retrieve another student's submissions → 403
    console.log("\n[TC05] Student attempts to retrieve all classroom submissions (Privacy RBAC)...");
    const tc05 = await makeRequest({
        path: `/api/submissions/task/${assignment1Id}`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (tc05.status !== 403) throw new Error(`TC05 Failed! Expected 403, got ${tc05.status}`);
    console.log(`✓ TC05 PASSED: Student bulk submission query blocked with HTTP 403`);

    // TC06: Student attempts grading → 403
    console.log("\n[TC06] Student attempts grading on existing submission (RBAC)...");
    const tc06 = await makeRequest({
        path: `/api/submissions/${initialSubId}/grade`,
        method: 'PUT',
        cookie: student1Cookie,
        body: { marksAwarded: 100 }
    });
    if (tc06.status !== 403) throw new Error(`TC06 Failed! Expected 403, got ${tc06.status}`);
    console.log(`✓ TC06 PASSED: Student grading attempt blocked with HTTP 403`);

    // TC07: Teacher creates assignment with multiple reference attachments
    console.log("\n[TC07] Teacher creates assignment with multiple reference attachments...");
    const tc07 = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Lab 2: Raft Consensus Engine',
            description: 'Follow the attached architecture spec and starter files.',
            roomId,
            topic: 'Distributed Consensus',
            maxMarks: 100,
            attachments: [
                { title: 'Raft-Spec.pdf', fileName: 'Raft-Spec.pdf', fileUrl: 'https://nexgen.com/spec.pdf', fileType: 'pdf' },
                { title: 'Starter Repo', fileName: 'Starter Repo', fileUrl: 'https://github.com/nexgen/raft-starter', fileType: 'link' }
            ],
            rubric: [
                { criterion: 'Leader Election', points: 30, description: 'Correct term handling and heartbeat timers' },
                { criterion: 'Log Replication', points: 40, description: 'Consistency across quorum replicas' },
                { criterion: 'Safety & Persistence', points: 30, description: 'Survives crash and network partitions' }
            ],
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        }
    });
    if (tc07.status !== 201) throw new Error(`TC07 Failed with ${tc07.status}`);
    const assignment2Id = tc07.data.task._id;
    console.log(`✓ TC07 PASSED: Created assignment with ${tc07.data.task.attachments.length} reference attachments & 3 rubric items`);

    // TC08: Student sees teacher attachments
    console.log("\n[TC08] Student retrieves assignment and inspects attachments...");
    const tc08 = await makeRequest({
        path: `/api/tasks?roomId=${roomId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    const foundTask2 = tc08.data.tasks.find(t => t._id === assignment2Id);
    if (!foundTask2 || foundTask2.attachments.length !== 2) throw new Error("TC08 Failed: Attachments not found by student!");
    console.log(`✓ TC08 PASSED: Student successfully received ${foundTask2.attachments.length} reference attachments`);

    // TC09: Student uploads multiple submission files & saves
    console.log("\n[TC09] Student submits with multiple attachments...");
    const tc09 = await makeRequest({
        path: `/api/submissions/${assignment2Id}`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            roomId,
            content: 'Here is our implementation with full test passes.',
            attachments: [
                { title: 'raft_node.go', fileName: 'raft_node.go', fileUrl: 'data:text/plain;base64,cGFja2FnZSBtYWluCg==', fileType: 'text/plain' },
                { title: 'benchmarks.pdf', fileName: 'benchmarks.pdf', fileUrl: 'data:application/pdf;base64,JVBERi0xLjQK', fileType: 'application/pdf' }
            ]
        }
    });
    if (tc09.status !== 200) throw new Error(`TC09 Failed with ${tc09.status}`);
    const sub1 = tc09.data.submission;
    console.log(`✓ TC09 PASSED: Submission recorded with ${sub1.attachments?.length} attachments`);

    // TC10 & TC11: Verify Turned In Status
    console.log("\n[TC10 & TC11] Verifying Turn In status...");
    if (sub1.status !== 'submitted') throw new Error(`TC10/11 Failed: status is ${sub1.status}`);
    console.log(`✓ TC10 & TC11 PASSED: Status is '${sub1.status}'`);

    // TC12: Student un-submits before deadline
    console.log("\n[TC12] Student un-submits assignment...");
    const tc12 = await makeRequest({
        path: `/api/submissions/${assignment2Id}`,
        method: 'POST',
        cookie: student1Cookie,
        body: { roomId, unsubmit: true }
    });
    if (tc12.status !== 200 || tc12.data.submission.status !== 'unsubmitted') throw new Error("TC12 Failed: Unsubmit failed!");
    console.log(`✓ TC12 PASSED: Submission status is '${tc12.data.submission.status}'`);

    // TC13: Student resubmits
    console.log("\n[TC13] Student resubmits assignment...");
    const tc13 = await makeRequest({
        path: `/api/submissions/${assignment2Id}`,
        method: 'POST',
        cookie: student1Cookie,
        body: {
            roomId,
            content: 'Resubmitted with optimized election timeouts.',
            attachments: [
                { title: 'raft_node_v2.go', fileName: 'raft_node_v2.go', fileUrl: 'data:text/plain;base64,cGFja2FnZSBtYWluCnYyCg==', fileType: 'text/plain' }
            ]
        }
    });
    if (tc13.status !== 200 || tc13.data.submission.status !== 'submitted') throw new Error("TC13 Failed: Resubmit failed!");
    console.log(`✓ TC13 PASSED: Resubmission status is '${tc13.data.submission.status}'`);

    // TC14: Late submission correctly detected
    console.log("\n[TC14] Testing late submission detection...");
    const pastTask = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Past Quiz 1',
            roomId,
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // yesterday
        }
    });
    const pastTaskId = pastTask.data.task._id;
    const lateSub = await makeRequest({
        path: `/api/submissions/${pastTaskId}`,
        method: 'POST',
        cookie: student2Cookie,
        body: { roomId, content: 'Late quiz answers' }
    });
    if (lateSub.data.submission.status !== 'late') throw new Error(`TC14 Failed: Expected 'late', got '${lateSub.data.submission.status}'`);
    console.log(`✓ TC14 PASSED: Late submission correctly detected with status '${lateSub.data.submission.status}'`);

    // TC15: Teacher retrieves student submissions
    console.log("\n[TC15] Teacher retrieves student submissions...");
    const tc15 = await makeRequest({
        path: `/api/submissions/task/${assignment2Id}`,
        method: 'GET',
        cookie: teacherCookie
    });
    if (tc15.status !== 200 || tc15.data.submissions.length === 0) throw new Error("TC15 Failed!");
    const teacherFetchedSub = tc15.data.submissions[0];
    console.log(`✓ TC15 PASSED: Teacher retrieved ${tc15.data.submissions.length} submissions`);

    // TC16 & TC17: Teacher grades using Rubric & Backend calculates total correctly
    console.log("\n[TC16 & TC17] Teacher grades using Rubric (30 + 38 + 28 = 96)...");
    const tc16 = await makeRequest({
        path: `/api/submissions/${teacherFetchedSub._id}/grade`,
        method: 'PUT',
        cookie: teacherCookie,
        body: {
            rubricEvaluation: [
                { criterion: 'Leader Election', pointsAwarded: 30, maxPoints: 30, feedback: 'Flawless election logic' },
                { criterion: 'Log Replication', pointsAwarded: 38, maxPoints: 40, feedback: 'Minor log compaction bug' },
                { criterion: 'Safety & Persistence', pointsAwarded: 28, maxPoints: 30, feedback: 'Solid persistence logic' }
            ],
            teacherFeedback: 'Great engineering work overall!'
        }
    });
    if (tc16.status !== 200) throw new Error(`TC16/17 Failed with status ${tc16.status}`);
    const gradedSub = tc16.data.submission;
    if (gradedSub.marksAwarded !== 96 || gradedSub.status !== 'graded') {
        throw new Error(`TC16/17 Failed: Expected 96 marks and 'graded', got ${gradedSub.marksAwarded} and '${gradedSub.status}'`);
    }
    console.log(`✓ TC16 & TC17 PASSED: Rubric total calculated to ${gradedSub.marksAwarded}/100 and status is '${gradedSub.status}'`);

    // TC18: Student sees rubric result
    console.log("\n[TC18] Student retrieves rubric results...");
    const tc18 = await makeRequest({
        path: `/api/submissions/me?roomId=${roomId}`,
        method: 'GET',
        cookie: student1Cookie
    });
    const studentViewSub = tc18.data.submissions.find(s => s.taskId?._id === assignment2Id || s.taskId === assignment2Id);
    if (!studentViewSub || studentViewSub.marksAwarded !== 96) throw new Error("TC18 Failed: Student did not receive rubric score!");
    console.log(`✓ TC18 PASSED: Student sees returned score: ${studentViewSub.marksAwarded}/100 with teacher feedback: "${studentViewSub.teacherFeedback}"`);

    // TC19 & TC20 & TC21: Topic creation, assignment under topic & filter
    console.log("\n[TC19, TC20, TC21] Topic Management & Filtering...");
    const topicTask = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Module 3: Cloud Native Microservices',
            topic: 'Cloud Microservices',
            roomId
        }
    });
    const filterRes = await makeRequest({
        path: `/api/tasks?roomId=${roomId}&topic=Cloud Microservices`,
        method: 'GET',
        cookie: student1Cookie
    });
    if (filterRes.data.tasks.length !== 1 || filterRes.data.tasks[0].topic !== 'Cloud Microservices') {
        throw new Error("TC19-21 Failed: Topic filter returned unexpected results!");
    }
    console.log(`✓ TC19, TC20 & TC21 PASSED: Topic filter returned ${filterRes.data.tasks.length} item matching topic 'Cloud Microservices'`);

    // TC22 & TC23: Draft visibility
    console.log("\n[TC22 & TC23] Draft Assignment Visibility Check...");
    const draftTask = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Unpublished Secret Exam',
            isDraft: true,
            roomId
        }
    });
    const draftId = draftTask.data.task._id;

    // Student query
    const studentTasks = await makeRequest({ path: `/api/tasks?roomId=${roomId}`, method: 'GET', cookie: student1Cookie });
    const studentFoundDraft = studentTasks.data.tasks.find(t => t._id === draftId);
    if (studentFoundDraft) throw new Error("TC22 Failed: Draft task was visible to student!");
    console.log("✓ TC22 PASSED: Draft assignment is INVISIBLE to student");

    // Teacher query
    const teacherTasks = await makeRequest({ path: `/api/tasks?roomId=${roomId}`, method: 'GET', cookie: teacherCookie });
    const teacherFoundDraft = teacherTasks.data.tasks.find(t => t._id === draftId);
    if (!teacherFoundDraft || !teacherFoundDraft.isDraft) throw new Error("TC23 Failed: Teacher cannot see draft!");
    console.log("✓ TC23 PASSED: Draft assignment is VISIBLE to teacher with isDraft: true");

    // TC24 & TC25: Individual assignment visibility
    console.log("\n[TC24 & TC25] Individual Student Assignment Visibility...");
    const targetedTask = await makeRequest({
        path: '/api/tasks',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            title: 'Honors Track Research Paper',
            roomId,
            assignedTo: [student1Id] // only assigned to Alice
        }
    });
    const targetedId = targetedTask.data.task._id;

    // Alice query (assigned)
    const aliceTasks = await makeRequest({ path: `/api/tasks?roomId=${roomId}`, method: 'GET', cookie: student1Cookie });
    const aliceFound = aliceTasks.data.tasks.find(t => t._id === targetedId);
    if (!aliceFound) throw new Error("TC24 Failed: Assigned student Alice could not see targeted task!");
    console.log("✓ TC24 PASSED: Assigned student (Alice) sees targeted task");

    // Bob query (unassigned)
    const bobTasks = await makeRequest({ path: `/api/tasks?roomId=${roomId}`, method: 'GET', cookie: student2Cookie });
    const bobFound = bobTasks.data.tasks.find(t => t._id === targetedId);
    if (bobFound) throw new Error("TC25 Failed: Unassigned student Bob could see targeted task!");
    console.log("✓ TC25 PASSED: Unassigned student (Bob) CANNOT see unassigned task");

    // TC26 & TC27: Calendar integration
    console.log("\n[TC26 & TC27] Calendar Task Aggregation...");
    const calTasks = await makeRequest({ path: '/api/tasks?roomId=all', method: 'GET', cookie: student1Cookie });
    const calHasDraft = calTasks.data.tasks.some(t => t._id === draftId);
    if (calHasDraft) throw new Error("TC27 Failed: Draft task appeared in student calendar!");
    console.log("✓ TC26 & TC27 PASSED: Calendar aggregates published tasks and excludes drafts");

    // TC28: Stream integration
    console.log("\n[TC28] Stream Integration Check...");
    const streamRes = await makeRequest({ path: `/api/rooms/${roomId}/stream`, method: 'GET', cookie: student1Cookie });
    if (streamRes.status !== 200) throw new Error("TC28 Failed: Stream retrieval failed!");
    console.log(`✓ TC28 PASSED: Stream operational with status 200`);

    // TC29: Grades Tab Data Check
    console.log("\n[TC29] Grades Tab Regression Check...");
    const allSubsTeacher = await makeRequest({ path: `/api/submissions/task/${assignment2Id}`, method: 'GET', cookie: teacherCookie });
    if (allSubsTeacher.data.submissions.length === 0) throw new Error("TC29 Failed: Grades data missing!");
    console.log(`✓ TC29 PASSED: Grades data correctly populates with score ${allSubsTeacher.data.submissions[0].marksAwarded}`);

    // TC30: Attendance Regression Check
    console.log("\n[TC30] Attendance Module Regression Check...");
    const attRes = await makeRequest({
        path: '/api/attendance',
        method: 'POST',
        cookie: teacherCookie,
        body: {
            roomId,
            date: new Date().toISOString().split('T')[0],
            records: [{ student: student1Id, status: 'Present' }]
        }
    });
    if (attRes.status !== 200 && attRes.status !== 201) throw new Error(`TC30 Failed: Attendance returned ${attRes.status}`);
    console.log(`✓ TC30 PASSED: Attendance recorded successfully (Status: ${attRes.status})`);

    // TC31: Analytics Regression Check
    console.log("\n[TC31] Analytics Module Regression Check...");
    const teacherDash = await makeRequest({ path: '/api/rooms/dashboard/summary', method: 'GET', cookie: teacherCookie });
    if (teacherDash.status !== 200) throw new Error("TC31 Failed: Analytics summary failed!");
    console.log(`✓ TC31 PASSED: Dashboard summary returned totalClassrooms: ${teacherDash.data.summary?.totalClassrooms}`);

    // TC32: Existing Classroom Core Tests
    console.log("\n[TC32] Running Existing Classroom Core Test Suite...");
    const { execSync } = require('child_process');
    const out32 = execSync('node tests/test_classroom_flow.js', { cwd: __dirname + '/..' }).toString();
    if (!out32.includes("ALL 11 AUTOMATED TESTS PASSED SUCCESSFULLY!")) {
        throw new Error("TC32 Failed: Existing classroom flow test failed!");
    }
    console.log("✓ TC32 PASSED: test_classroom_flow.js passed 100%");

    // TC33: Existing E2E User Journey Test
    console.log("\n[TC33] Running Existing E2E User Journey Test Suite...");
    const out33 = execSync('node tests/test_e2e_user_journey.js', { cwd: __dirname + '/..' }).toString();
    if (!out33.includes("ALL 15 MANUAL QA WORKFLOW CHECKS PASSED 100%!")) {
        throw new Error("TC33 Failed: Existing E2E user journey test failed!");
    }
    console.log("✓ TC33 PASSED: test_e2e_user_journey.js passed 100%");

    console.log("\n==================================================");
    console.log("ALL 33 CLASSWORK 2.0 AUTOMATED TESTS PASSED! ✓");
    console.log("==================================================");

    process.exit(0);
}

runTestSuite().catch(err => {
    console.error("Test Suite Failure:", err);
    process.exit(1);
});
