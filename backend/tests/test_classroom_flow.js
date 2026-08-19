const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/user-model');
const Room = require('../models/room-model');
const Announcement = require('../models/announcement-model');
const Task = require('../models/task-model');
const Submission = require('../models/submission-model');
const Attendance = require('../models/attendance-model');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://manas:manas2005@nexgenclass.jndf9.mongodb.net/?retryWrites=true&w=majority&appName=NexGenClass';

async function runTests() {
    console.log("==================================================");
    console.log("STARTING NEXGENCLASS CORE CLASSROOM TEST SUITE");
    console.log("==================================================");

    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Clean up or find test users
    let teacher = await User.findOne({ email: 'test_teacher_auto@nexgen.com' });
    if (!teacher) {
        teacher = await User.create({
            fullname: 'Prof. Automata',
            email: 'test_teacher_auto@nexgen.com',
            password: 'hashed_password_123',
            role: 'teacher'
        });
    }

    let student = await User.findOne({ email: 'test_student_auto@nexgen.com' });
    if (!student) {
        student = await User.create({
            fullname: 'Jane Student',
            email: 'test_student_auto@nexgen.com',
            password: 'hashed_password_123',
            role: 'student'
        });
    }

    console.log(`✓ Test Teacher: ${teacher.fullname} (${teacher._id})`);
    console.log(`✓ Test Student: ${student.fullname} (${student._id})`);

    // TC01: Create Classroom with section, subject, room, description, banner
    console.log("\n[TC01] Creating new Classroom with Google Classroom fields...");
    const crypto = require('crypto');
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const room = await Room.create({
        name: 'Advanced Software Engineering',
        section: 'Section B',
        subject: 'Computer Science',
        room: 'Lab 501',
        description: 'Comprehensive software engineering and system architecture course.',
        banner: 'indigo',
        code,
        owner: teacher._id,
        members: [teacher._id],
        streamSettings: {
            whoCanPost: 'students_post_comment',
            classworkOnStream: 'show_all',
            showDeletedItems: false
        },
        gradingSettings: {
            gradeCalculation: 'total_points',
            showOverallGradeToStudents: true
        }
    });

    console.log(`✓ Classroom created: "${room.name}" | Code: ${room.code} | ID: ${room._id}`);
    if (room.section !== 'Section B' || room.banner !== 'indigo') {
        throw new Error("Classroom fields not correctly saved!");
    }

    // TC02: Student joins classroom via code
    console.log("\n[TC02] Student joins Classroom by code...");
    const foundRoom = await Room.findOne({ code: room.code });
    if (!foundRoom) throw new Error("Room code not found!");
    if (!foundRoom.members.includes(student._id)) {
        foundRoom.members.push(student._id);
        await foundRoom.save();
    }
    console.log(`✓ Student joined. Member count: ${foundRoom.members.length}`);

    // TC03: Teacher posts stream announcement
    console.log("\n[TC03] Teacher creates Announcement on Stream...");
    const announcement = await Announcement.create({
        roomId: room._id,
        author: teacher._id,
        authorName: teacher.fullname,
        authorRole: 'teacher',
        content: 'Welcome to Advanced Software Engineering! Please review the syllabus.',
        attachments: [{ title: 'Syllabus.pdf', url: 'https://nexgenclass.com/syllabus.pdf', fileType: 'pdf' }]
    });
    console.log(`✓ Announcement created: "${announcement.content}" (ID: ${announcement._id})`);

    // TC04: Student adds comment to announcement
    console.log("\n[TC04] Student adds comment to Announcement...");
    announcement.comments.push({
        author: student._id,
        authorName: student.fullname,
        authorRole: 'student',
        content: 'Thank you professor! Looking forward to the semester.'
    });
    await announcement.save();
    console.log(`✓ Comment added. Total comments: ${announcement.comments.length}`);

    // TC05: Update Stream Permissions to teachers_only
    console.log("\n[TC05] Updating Stream Permissions to 'teachers_only'...");
    room.streamSettings.whoCanPost = 'teachers_only';
    await room.save();
    console.log(`✓ Stream settings updated: whoCanPost = ${room.streamSettings.whoCanPost}`);

    // TC06: Regenerate Class Code
    console.log("\n[TC06] Regenerating unique class code...");
    const oldCode = room.code;
    const newCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    room.code = newCode;
    await room.save();
    console.log(`✓ Code regenerated from ${oldCode} -> ${newCode}`);

    // TC07: Toggle Join Code Disabled
    console.log("\n[TC07] Toggling joinEnabled to false...");
    room.joinEnabled = false;
    await room.save();
    console.log(`✓ joinEnabled is now ${room.joinEnabled}`);

    // TC08: Create Assignment Task
    console.log("\n[TC08] Teacher creates assignment for the class...");
    const task = await Task.create({
        title: 'Project Milestone 1: Architecture Design',
        description: 'Submit your architectural diagrams and database schema design.',
        room: room._id,
        owner: teacher._id,
        maxMarks: 100,
        taskType: 'assignment',
        category: 'Assignments',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    console.log(`✓ Task created: "${task.title}" (Max marks: ${task.maxMarks})`);

    // TC09: Student submits assignment
    console.log("\n[TC09] Student submits assignment...");
    const submission = await Submission.create({
        taskId: task._id,
        studentId: student._id,
        roomId: room._id,
        content: 'Here is the link to our architecture documentation: https://github.com/nexgenclass/project',
        status: 'submitted'
    });
    console.log(`✓ Submission recorded: ID ${submission._id} | Status: ${submission.status}`);

    // TC10: Teacher grades submission
    console.log("\n[TC10] Teacher grades student submission...");
    submission.marksAwarded = 95;
    submission.grade = '95';
    submission.teacherFeedback = 'Excellent modular design and clear schemas!';
    submission.status = 'graded';
    submission.gradedAt = new Date();
    submission.gradedBy = teacher._id;
    await submission.save();
    console.log(`✓ Graded: ${submission.marksAwarded}/${task.maxMarks} with feedback: "${submission.teacherFeedback}"`);

    // TC11: Regression verify Attendance
    console.log("\n[TC11] Verifying Attendance model compatibility...");
    const attRecord = await Attendance.create({
        roomId: room._id,
        date: new Date().toISOString().split('T')[0],
        records: [{
            student: student._id,
            status: 'Present',
            remarks: 'On time'
        }]
    });
    console.log(`✓ Attendance recorded successfully for date ${attRecord.date}`);

    // Clean up test data
    console.log("\n[CLEANUP] Cleaning up test records...");
    await Submission.deleteMany({ roomId: room._id });
    await Task.deleteMany({ room: room._id });
    await Announcement.deleteMany({ roomId: room._id });
    await Attendance.deleteMany({ roomId: room._id });
    await Room.findByIdAndDelete(room._id);
    console.log("✓ Cleanup completed successfully.");

    console.log("\n==================================================");
    console.log("ALL 11 AUTOMATED TESTS PASSED SUCCESSFULLY! ✓");
    console.log("==================================================");

    process.exit(0);
}

runTests().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
});
