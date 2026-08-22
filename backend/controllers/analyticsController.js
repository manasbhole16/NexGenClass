const mongoose = require("mongoose");
const Task = require("../models/task-model");
const Submission = require("../models/submission-model");
const Quiz = require("../models/quiz-model");
const Question = require("../models/question-model");
const Attempt = require("../models/attempt-model");
const Attendance = require("../models/attendance-model");
const Room = require("../models/room-model");
const User = require("../models/user-model");
const Form = require("../models/form-model");
const FormResponse = require("../models/formResponse-model");
const AssessmentSubmission = require("../models/assessment-submission-model");

// Helper: Check if teacher owns or co-teaches the room
async function isAuthorizedTeacher(user, roomId) {
    if (!user || user.role !== "teacher" || !roomId) return false;
    const room = await Room.findById(roomId).select("owner members");
    if (!room) return false;
    const isOwner = room.owner.toString() === user._id.toString();
    const isMember = (room.members || []).some(m => m.toString() === user._id.toString());
    return isOwner || isMember;
}

// Helper: Format Date YYYY-MM-DD
function toDateStr(date) {
    if (!date) return null;
    try {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
    } catch {
        return null;
    }
}

// Helper: Safe Percentage calculation (never NaN, never Infinity)
function safePercent(numerator, denominator, decimals = 0) {
    if (!denominator || denominator <= 0 || !numerator || numerator <= 0) return 0;
    const val = (numerator / denominator) * 100;
    if (isNaN(val) || !isFinite(val)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}

// Helper: Safe Average calculation
function safeAverage(numbers, decimals = 0) {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    const valid = numbers.filter(n => typeof n === "number" && !isNaN(n) && isFinite(n));
    if (valid.length === 0) return 0;
    const sum = valid.reduce((a, b) => a + b, 0);
    const avg = sum / valid.length;
    const factor = Math.pow(10, decimals);
    return Math.round(avg * factor) / factor;
}

// Helper: Safe Median calculation
function safeMedian(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    const valid = numbers.filter(n => typeof n === "number" && !isNaN(n) && isFinite(n)).sort((a, b) => a - b);
    if (valid.length === 0) return 0;
    const mid = Math.floor(valid.length / 2);
    if (valid.length % 2 !== 0) return valid[mid];
    return Math.round((valid[mid - 1] + valid[mid]) / 2);
}

// =========================================================================
// 1. STUDENT ANALYTICS DASHBOARD (Global or Classroom-scoped)
// =========================================================================
exports.getStudentAnalytics = async (req, res) => {
    try {
        const studentId = req.user._id;
        const { roomId, startDate, endDate } = req.query;

        // Find enrolled classrooms
        const enrolledRooms = await Room.find({ members: studentId }).select("_id name code subject section owner");
        const enrolledRoomIds = enrolledRooms.map(r => r._id);
        const roomMap = new Map(enrolledRooms.map(r => [r._id.toString(), r]));

        let targetRoomIds = enrolledRoomIds;
        if (roomId && roomId !== "all") {
            if (!enrolledRoomIds.some(id => id.toString() === roomId)) {
                return res.status(403).json({ success: false, message: "Access denied to this classroom." });
            }
            targetRoomIds = [new mongoose.Types.ObjectId(roomId)];
        }

        const now = new Date();
        const startFilter = startDate ? new Date(startDate) : null;
        const endFilter = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

        // -----------------------------------------------------------
        // A. ATTENDANCE 2.0 ANALYTICS
        // -----------------------------------------------------------
        const attQuery = { roomId: { $in: targetRoomIds } };
        if (startFilter || endFilter) {
            const sStr = startFilter ? toDateStr(startFilter) : null;
            const eStr = endFilter ? toDateStr(endFilter) : null;
            if (sStr && eStr) attQuery.date = { $gte: sStr, $lte: eStr };
            else if (sStr) attQuery.date = { $gte: sStr };
            else if (eStr) attQuery.date = { $lte: eStr };
        }

        const attendanceSessions = await Attendance.find(attQuery).sort({ date: 1 });
        let totalSessions = 0;
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        const attendanceHistory = [];
        const subjectAttMap = {};

        // Initialize subject attendance map
        targetRoomIds.forEach(id => {
            const rObj = roomMap.get(id.toString());
            if (rObj) {
                subjectAttMap[id.toString()] = {
                    roomId: id.toString(),
                    roomName: rObj.name,
                    total: 0,
                    attended: 0,
                    present: 0,
                    late: 0,
                    absent: 0
                };
            }
        });

        attendanceSessions.forEach(session => {
            const sRoomId = session.roomId.toString();
            const record = session.records?.find(r => r.student?.toString() === studentId.toString());
            const status = record ? record.status : "Absent";

            totalSessions++;
            if (status === "Present") presentCount++;
            else if (status === "Late") lateCount++;
            else absentCount++;

            if (subjectAttMap[sRoomId]) {
                subjectAttMap[sRoomId].total++;
                if (status === "Present" || status === "Late") subjectAttMap[sRoomId].attended++;
                if (status === "Present") subjectAttMap[sRoomId].present++;
                else if (status === "Late") subjectAttMap[sRoomId].late++;
                else subjectAttMap[sRoomId].absent++;
            }

            attendanceHistory.push({
                date: session.date,
                title: session.title,
                sessionType: session.sessionType,
                status,
                roomName: roomMap.get(sRoomId)?.name || "Classroom"
            });
        });

        const overallAttended = presentCount + lateCount;
        const overallAttendancePercent = safePercent(overallAttended, totalSessions);
        const isBelowAttendanceThreshold = totalSessions > 0 && overallAttendancePercent < 75;

        const subjectAttendanceBreakdown = Object.values(subjectAttMap).map(subj => ({
            ...subj,
            percentage: safePercent(subj.attended, subj.total),
            isBelowThreshold: subj.total > 0 && safePercent(subj.attended, subj.total) < 75
        }));

        // -----------------------------------------------------------
        // B. ASSIGNMENT & SUBMISSION ANALYTICS
        // -----------------------------------------------------------
        const taskQuery = {
            room: { $in: targetRoomIds },
            isDraft: { $ne: true },
            taskType: { $in: ["assignment", "material"] }
        };
        if (startFilter || endFilter) {
            taskQuery.dueDate = {};
            if (startFilter) taskQuery.dueDate.$gte = startFilter;
            if (endFilter) taskQuery.dueDate.$lte = endFilter;
        }

        const eligibleTasks = await Task.find(taskQuery)
            .populate("room", "name code")
            .select("title dueDate maxMarks priority topic room assignedTo taskType");

        // Filter tasks assigned to all or explicitly to student
        const studentTasks = eligibleTasks.filter(t => {
            if (!Array.isArray(t.assignedTo) || t.assignedTo.length === 0) return true;
            return t.assignedTo.some(id => id.toString() === studentId.toString());
        });

        const taskIds = studentTasks.map(t => t._id);
        const submissions = await Submission.find({
            studentId,
            taskId: { $in: taskIds }
        }).select("taskId status marksAwarded grade submittedAt createdAt");

        const subMap = new Map();
        submissions.forEach(s => subMap.set(s.taskId.toString(), s));

        let totalAssignments = studentTasks.length;
        let submittedCount = 0;
        let onTimeCount = 0;
        let lateSubmissionsCount = 0;
        let overdueCount = 0;
        let gradedAssignmentCount = 0;
        const assignmentGrades = [];
        const performanceTimeline = [];
        const subjectAssignmentMap = {};

        targetRoomIds.forEach(id => {
            const rObj = roomMap.get(id.toString());
            if (rObj) {
                subjectAssignmentMap[id.toString()] = {
                    roomId: id.toString(),
                    roomName: rObj.name,
                    assigned: 0,
                    submitted: 0,
                    grades: []
                };
            }
        });

        studentTasks.forEach(task => {
            const sub = subMap.get(task._id.toString());
            const tRoomId = task.room?._id?.toString() || task.room?.toString();
            const isDue = task.dueDate && new Date(task.dueDate) < now;

            if (subjectAssignmentMap[tRoomId]) {
                subjectAssignmentMap[tRoomId].assigned++;
            }

            if (sub) {
                submittedCount++;
                if (sub.status === "late") lateSubmissionsCount++;
                else onTimeCount++;

                if (subjectAssignmentMap[tRoomId]) {
                    subjectAssignmentMap[tRoomId].submitted++;
                }

                // Check if graded
                const gradeValue = sub.marksAwarded != null ? Number(sub.marksAwarded) : (sub.grade != null ? Number(sub.grade) : null);
                if (gradeValue !== null && !isNaN(gradeValue)) {
                    const max = task.maxMarks || 100;
                    const percentScore = safePercent(gradeValue, max, 1);
                    assignmentGrades.push(percentScore);
                    gradedAssignmentCount++;

                    if (subjectAssignmentMap[tRoomId]) {
                        subjectAssignmentMap[tRoomId].grades.push(percentScore);
                    }

                    performanceTimeline.push({
                        date: toDateStr(sub.submittedAt || sub.createdAt),
                        title: task.title,
                        type: "assignment",
                        score: percentScore,
                        rawScore: gradeValue,
                        maxMarks: max,
                        roomName: task.room?.name || "Classroom"
                    });
                }
            } else if (isDue) {
                overdueCount++;
            }
        });

        const assignmentCompletionRate = safePercent(submittedCount, totalAssignments);
        const onTimeSubmissionRate = safePercent(onTimeCount, submittedCount);
        const averageAssignmentGrade = safeAverage(assignmentGrades, 1);

        // -----------------------------------------------------------
        // C. QUIZ & ASSESSMENT ANALYTICS (Phase 3 Integration)
        // -----------------------------------------------------------
        const quizQuery = {
            roomId: { $in: targetRoomIds },
            isPublished: true
        };
        const quizzes = await Quiz.find(quizQuery).select("title deadline startDate totalMarks passingMarks resultVisibility isResultsReleased topic roomId");
        const quizIds = quizzes.map(q => q._id);

        const attempts = await Attempt.find({
            studentId,
            quizId: { $in: quizIds },
            status: { $in: ["submitted", "graded"] }
        }).populate("quizId", "title totalMarks passingMarks resultVisibility isResultsReleased roomId");

        let totalQuizzes = quizzes.length;
        let completedQuizzesCount = attempts.length;
        let passedQuizzesCount = 0;
        const quizScores = [];
        const subjectQuizMap = {};

        targetRoomIds.forEach(id => {
            subjectQuizMap[id.toString()] = [];
        });

        attempts.forEach(att => {
            const q = att.quizId;
            if (!q) return;

            // Strict Result Visibility Check for Student:
            // If results are manual_release and not released, do not expose score!
            const isResultHidden = q.resultVisibility === "manual_release" && !q.isResultsReleased;
            if (isResultHidden) return;

            const total = q.totalMarks || 100;
            const passing = q.passingMarks || Math.round(total * 0.4);
            const scorePercent = safePercent(att.score, total, 1);

            quizScores.push(scorePercent);
            if (att.score >= passing) passedQuizzesCount++;

            const qRoomId = q.roomId?.toString();
            if (subjectQuizMap[qRoomId]) {
                subjectQuizMap[qRoomId].push(scorePercent);
            }

            performanceTimeline.push({
                date: toDateStr(att.submittedAt || att.createdAt),
                title: q.title,
                type: "quiz",
                score: scorePercent,
                rawScore: att.score,
                maxMarks: total,
                roomName: roomMap.get(qRoomId)?.name || "Classroom"
            });
        });

        const averageQuizScore = safeAverage(quizScores, 1);
        const quizPassRate = safePercent(passedQuizzesCount, quizScores.length);

        // Sort performance timeline chronologically
        performanceTimeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        // -----------------------------------------------------------
        // D. WORKLOAD & UPCOMING DEADLINES (Phase 5 Integration)
        // -----------------------------------------------------------
        const upcomingTasks = studentTasks.filter(t => t.dueDate && new Date(t.dueDate) > now && !subMap.has(t._id.toString()));
        const upcomingQuizzes = quizzes.filter(q => q.deadline && new Date(q.deadline) > now && !attempts.some(a => a.quizId?._id?.toString() === q._id.toString()));
        
        const pendingTotal = (totalAssignments - submittedCount) + (totalQuizzes - completedQuizzesCount);

        // -----------------------------------------------------------
        // E. SUBJECT / CLASSROOM COMPARISON MATRIX
        // -----------------------------------------------------------
        const subjectComparison = targetRoomIds.map(id => {
            const sid = id.toString();
            const rObj = roomMap.get(sid);
            const attSubj = subjectAttMap[sid] || { total: 0, attended: 0 };
            const assignSubj = subjectAssignmentMap[sid] || { assigned: 0, submitted: 0, grades: [] };
            const quizGrades = subjectQuizMap[sid] || [];

            return {
                roomId: sid,
                roomName: rObj?.name || "Classroom",
                code: rObj?.code || "",
                attendancePercent: safePercent(attSubj.attended, attSubj.total),
                assignmentCompletionPercent: safePercent(assignSubj.submitted, assignSubj.assigned),
                averageAssignmentGrade: safeAverage(assignSubj.grades, 1),
                averageQuizScore: safeAverage(quizGrades, 1),
                pendingDeliverables: (assignSubj.assigned - assignSubj.submitted)
            };
        });

        // -----------------------------------------------------------
        // F. TRANSPARENT RULE-BASED ACADEMIC ATTENTION INDICATORS
        // -----------------------------------------------------------
        const attentionAlerts = [];
        if (isBelowAttendanceThreshold) {
            attentionAlerts.push({
                type: "attendance_warning",
                severity: "high",
                title: "Attendance Below Threshold",
                message: `Overall attendance is ${overallAttendancePercent}%, which is below the 75% requirement.`
            });
        }
        if (overdueCount > 0) {
            attentionAlerts.push({
                type: "overdue_assignments",
                severity: overdueCount >= 3 ? "high" : "medium",
                title: "Overdue Deliverables",
                message: `You have ${overdueCount} overdue assignment(s) that require submission.`
            });
        }
        if (assignmentGrades.length >= 2 && averageAssignmentGrade < 60) {
            attentionAlerts.push({
                type: "academic_performance",
                severity: "medium",
                title: "Assignment Performance Alert",
                message: `Average assignment grade is ${averageAssignmentGrade}%. Review recent teacher feedback.`
            });
        }
        if (quizScores.length >= 2 && averageQuizScore < 60) {
            attentionAlerts.push({
                type: "quiz_performance",
                severity: "medium",
                title: "Quiz Mastery Alert",
                message: `Average quiz score is ${averageQuizScore}%. Consider revisiting prerequisite topics.`
            });
        }

        res.status(200).json({
            success: true,
            summary: {
                overallAttendancePercent,
                totalAttendanceSessions: totalSessions,
                attendedSessions: overallAttended,
                isBelowAttendanceThreshold,
                totalAssignments,
                submittedAssignments: submittedCount,
                assignmentCompletionRate,
                onTimeSubmissionRate,
                averageAssignmentGrade,
                totalQuizzes,
                completedQuizzesCount,
                averageQuizScore,
                quizPassRate,
                pendingDeliverablesCount: Math.max(0, pendingTotal),
                overdueDeliverablesCount: overdueCount,
                enrolledClassroomsCount: enrolledRoomIds.length
            },
            attendance: {
                totalSessions,
                presentCount,
                lateCount,
                absentCount,
                percentage: overallAttendancePercent,
                subjectBreakdown: subjectAttendanceBreakdown,
                history: attendanceHistory.slice(-10) // last 10 records
            },
            assignments: {
                total: totalAssignments,
                submitted: submittedCount,
                onTime: onTimeCount,
                late: lateSubmissionsCount,
                overdue: overdueCount,
                averageGrade: averageAssignmentGrade,
                completionRate: assignmentCompletionRate
            },
            quizzes: {
                total: totalQuizzes,
                completed: completedQuizzesCount,
                passed: passedQuizzesCount,
                averageScore: averageQuizScore,
                passRate: quizPassRate
            },
            performanceTimeline,
            subjectComparison,
            attentionAlerts,
            upcomingDeliverables: [
                ...upcomingTasks.map(t => ({ id: t._id, title: t.title, type: "assignment", dueDate: t.dueDate, roomName: t.room?.name })),
                ...upcomingQuizzes.map(q => ({ id: q._id, title: q.title, type: "quiz", dueDate: q.deadline, roomName: roomMap.get(q.roomId?.toString())?.name }))
            ].slice(0, 5)
        });
    } catch (error) {
        console.error("getStudentAnalytics error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

// =========================================================================
// 2. TEACHER CLASSROOM ANALYTICS DASHBOARD
// =========================================================================
exports.getClassroomAnalytics = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { startDate, endDate, topic } = req.query;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: "Invalid classroom ID format." });
        }

        const room = await Room.findById(roomId).populate("members", "fullname email role");
        if (!room) {
            return res.status(404).json({ success: false, message: "Classroom not found." });
        }

        // Server-side RBAC: Only authorized teachers can access
        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Forbidden: Only classroom instructors can view class analytics." });
        }

        const now = new Date();
        const startFilter = startDate ? new Date(startDate) : null;
        const endFilter = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

        // Filter eligible students (exclude teacher owner)
        const enrolledStudents = (room.members || []).filter(m => 
            (m.role || "student").toLowerCase() === "student" && 
            m._id.toString() !== room.owner.toString()
        );
        const studentIds = enrolledStudents.map(s => s._id);
        const totalStudentsCount = enrolledStudents.length;

        // -----------------------------------------------------------
        // A. CLASSROOM ATTENDANCE 2.0 ANALYTICS
        // -----------------------------------------------------------
        const attQuery = { roomId };
        if (startFilter || endFilter) {
            const sStr = startFilter ? toDateStr(startFilter) : null;
            const eStr = endFilter ? toDateStr(endFilter) : null;
            if (sStr && eStr) attQuery.date = { $gte: sStr, $lte: eStr };
            else if (sStr) attQuery.date = { $gte: sStr };
            else if (eStr) attQuery.date = { $lte: eStr };
        }

        const sessions = await Attendance.find(attQuery).sort({ date: 1 });
        const totalSessionsCount = sessions.length;
        let classTotalPresent = 0;
        let classTotalLate = 0;
        let classTotalAbsent = 0;
        const studentAttMap = new Map();

        studentIds.forEach(id => {
            studentAttMap.set(id.toString(), { total: totalSessionsCount, attended: 0, present: 0, late: 0, absent: 0 });
        });

        const sessionTrend = sessions.map(sess => {
            let sPresent = 0;
            let sLate = 0;
            let sAbsent = 0;

            (sess.records || []).forEach(r => {
                const sid = r.student?.toString();
                if (r.status === "Present") {
                    sPresent++;
                    classTotalPresent++;
                    if (studentAttMap.has(sid)) {
                        studentAttMap.get(sid).present++;
                        studentAttMap.get(sid).attended++;
                    }
                } else if (r.status === "Late") {
                    sLate++;
                    classTotalLate++;
                    if (studentAttMap.has(sid)) {
                        studentAttMap.get(sid).late++;
                        studentAttMap.get(sid).attended++;
                    }
                } else {
                    sAbsent++;
                    classTotalAbsent++;
                    if (studentAttMap.has(sid)) {
                        studentAttMap.get(sid).absent++;
                    }
                }
            });

            const sessionTurnout = totalStudentsCount > 0 ? safePercent(sPresent + sLate, totalStudentsCount) : 0;
            return {
                sessionId: sess._id,
                title: sess.title,
                date: sess.date,
                sessionType: sess.sessionType,
                present: sPresent,
                late: sLate,
                absent: sAbsent,
                turnoutPercentage: sessionTurnout
            };
        });

        const totalPossibleSlots = totalStudentsCount * totalSessionsCount;
        const classOverallAttendancePercent = safePercent(classTotalPresent + classTotalLate, totalPossibleSlots);

        // -----------------------------------------------------------
        // B. ASSIGNMENT & SUBMISSION ANALYTICS
        // -----------------------------------------------------------
        const taskQuery = { room: roomId, isDraft: { $ne: true } };
        if (topic && topic !== "all") taskQuery.topic = topic;
        if (startFilter || endFilter) {
            taskQuery.dueDate = {};
            if (startFilter) taskQuery.dueDate.$gte = startFilter;
            if (endFilter) taskQuery.dueDate.$lte = endFilter;
        }

        const classTasks = await Task.find(taskQuery).select("title dueDate maxMarks topic taskType assignedTo");
        const classTaskIds = classTasks.map(t => t._id);

        const allSubmissions = await Submission.find({
            taskId: { $in: classTaskIds }
        }).populate("studentId", "fullname email").select("taskId studentId status marksAwarded grade submittedAt");

        const studentAssignmentMap = new Map();
        studentIds.forEach(id => {
            studentAssignmentMap.set(id.toString(), { assigned: classTasks.length, submitted: 0, onTime: 0, late: 0, grades: [] });
        });

        const assignmentItemStats = classTasks.map(task => {
            const subsForTask = allSubmissions.filter(s => s.taskId?.toString() === task._id.toString());
            const submittedCount = subsForTask.length;
            const lateCount = subsForTask.filter(s => s.status === "late").length;
            const gradedSubs = subsForTask.filter(s => s.marksAwarded != null || s.grade != null);
            const grades = gradedSubs.map(s => Number(s.marksAwarded != null ? s.marksAwarded : s.grade));
            const averageScore = safeAverage(grades, 1);
            const averagePercentage = safePercent(averageScore, task.maxMarks || 100, 1);

            return {
                taskId: task._id,
                title: task.title,
                dueDate: task.dueDate,
                topic: task.topic,
                maxMarks: task.maxMarks || 100,
                assignedCount: totalStudentsCount,
                submittedCount,
                missingCount: Math.max(0, totalStudentsCount - submittedCount),
                lateCount,
                gradedCount: gradedSubs.length,
                submissionRate: safePercent(submittedCount, totalStudentsCount),
                averageScore,
                averagePercentage
            };
        });

        allSubmissions.forEach(sub => {
            const sid = sub.studentId?._id?.toString() || sub.studentId?.toString();
            if (studentAssignmentMap.has(sid)) {
                const sObj = studentAssignmentMap.get(sid);
                sObj.submitted++;
                if (sub.status === "late") sObj.late++;
                else sObj.onTime++;

                const gVal = sub.marksAwarded != null ? Number(sub.marksAwarded) : (sub.grade != null ? Number(sub.grade) : null);
                if (gVal !== null && !isNaN(gVal)) {
                    sObj.grades.push(gVal);
                }
            }
        });

        const totalAssignedSlotCount = totalStudentsCount * classTasks.length;
        const totalTurnedInCount = allSubmissions.length;
        const classAssignmentSubmissionRate = safePercent(totalTurnedInCount, totalAssignedSlotCount);

        const allGradedScores = [];
        allSubmissions.forEach(s => {
            const g = s.marksAwarded != null ? Number(s.marksAwarded) : (s.grade != null ? Number(s.grade) : null);
            if (g !== null && !isNaN(g)) allGradedScores.push(g);
        });
        const classAverageAssignmentGrade = safeAverage(allGradedScores, 1);

        // -----------------------------------------------------------
        // C. QUIZ & QUESTION ITEM ANALYSIS (Phase 3 Integration)
        // -----------------------------------------------------------
        const quizzes = await Quiz.find({ roomId }).select("title deadline totalMarks passingMarks topic isPublished");
        const quizIds = quizzes.map(q => q._id);

        const allAttempts = await Attempt.find({
            quizId: { $in: quizIds },
            status: { $in: ["submitted", "graded"] }
        }).populate("studentId", "fullname email").select("quizId studentId score percentage answers isEvaluated");

        const studentQuizMap = new Map();
        studentIds.forEach(id => studentQuizMap.set(id.toString(), []));

        allAttempts.forEach(att => {
            const sid = att.studentId?._id?.toString() || att.studentId?.toString();
            if (studentQuizMap.has(sid)) {
                studentQuizMap.get(sid).push(att.percentage || att.score);
            }
        });

        const quizItemStats = quizzes.map(quiz => {
            const attsForQuiz = allAttempts.filter(a => a.quizId?.toString() === quiz._id.toString());
            const scores = attsForQuiz.map(a => a.percentage || safePercent(a.score, quiz.totalMarks || 100));
            const avg = safeAverage(scores, 1);
            const pass = attsForQuiz.filter(a => a.score >= (quiz.passingMarks || Math.round(quiz.totalMarks * 0.4))).length;

            return {
                quizId: quiz._id,
                title: quiz.title,
                topic: quiz.topic,
                totalMarks: quiz.totalMarks,
                attemptsCount: attsForQuiz.length,
                averagePercentage: avg,
                passRate: safePercent(pass, attsForQuiz.length)
            };
        });

        const allQuizPercentages = allAttempts.map(a => a.percentage || a.score);
        const classAverageQuizScore = safeAverage(allQuizPercentages, 1);

        // -----------------------------------------------------------
        // D. GRADE DISTRIBUTION BUCKETS
        // -----------------------------------------------------------
        const gradeBuckets = {
            "90-100": 0,
            "80-89": 0,
            "70-79": 0,
            "60-69": 0,
            "50-59": 0,
            "Below 50": 0
        };

        const studentAverageScores = [];
        studentIds.forEach(id => {
            const sid = id.toString();
            const aGrades = studentAssignmentMap.get(sid)?.grades || [];
            const qScores = studentQuizMap.get(sid) || [];
            const combined = [...aGrades, ...qScores];
            if (combined.length > 0) {
                const sAvg = safeAverage(combined, 1);
                studentAverageScores.push(sAvg);

                if (sAvg >= 90) gradeBuckets["90-100"]++;
                else if (sAvg >= 80) gradeBuckets["80-89"]++;
                else if (sAvg >= 70) gradeBuckets["70-79"]++;
                else if (sAvg >= 60) gradeBuckets["60-69"]++;
                else if (sAvg >= 50) gradeBuckets["50-59"]++;
                else gradeBuckets["Below 50"]++;
            }
        });

        // -----------------------------------------------------------
        // E. STUDENT PERFORMANCE ROSTER & TRANSPARENT AT-RISK MATRIX
        // -----------------------------------------------------------
        const needsAttentionRoster = [];
        const studentRoster = enrolledStudents.map(student => {
            const sid = student._id.toString();
            const att = studentAttMap.get(sid) || { total: 0, attended: 0 };
            const assign = studentAssignmentMap.get(sid) || { assigned: 0, submitted: 0, late: 0, grades: [] };
            const qScores = studentQuizMap.get(sid) || [];

            const attPercent = safePercent(att.attended, att.total);
            const assignCompletion = safePercent(assign.submitted, assign.assigned);
            const avgAssignment = safeAverage(assign.grades, 1);
            const avgQuiz = safeAverage(qScores, 1);
            const missingTasks = Math.max(0, assign.assigned - assign.submitted);

            // Transparent Needs Attention criteria
            const reasons = [];
            if (att.total > 0 && attPercent < 75) {
                reasons.push(`Attendance (${attPercent}%) is below 75% threshold`);
            }
            if (missingTasks >= 2) {
                reasons.push(`Has ${missingTasks} missing / unsubmitted assignment(s)`);
            }
            if (assign.grades.length > 0 && avgAssignment < 60) {
                reasons.push(`Average assignment grade (${avgAssignment}%) is below 60%`);
            }
            if (qScores.length > 0 && avgQuiz < 60) {
                reasons.push(`Average quiz score (${avgQuiz}%) is below 60%`);
            }

            const isAtRisk = reasons.length > 0;
            const record = {
                studentId: sid,
                fullname: student.fullname,
                email: student.email,
                attendancePercentage: attPercent,
                assignmentCompletionRate: assignCompletion,
                averageAssignmentGrade: avgAssignment,
                averageQuizScore: avgQuiz,
                missingAssignmentsCount: missingTasks,
                lateAssignmentsCount: assign.late,
                status: isAtRisk ? "Needs Attention" : "Healthy",
                attentionReasons: reasons
            };

            if (isAtRisk) {
                needsAttentionRoster.push(record);
            }

            return record;
        });

        res.status(200).json({
            success: true,
            classroom: {
                _id: room._id,
                name: room.name,
                code: room.code,
                subject: room.subject,
                section: room.section,
                totalStudents: totalStudentsCount
            },
            summary: {
                totalStudents: totalStudentsCount,
                classAverageGrade: safeAverage(studentAverageScores, 1),
                assignmentSubmissionRate: classAssignmentSubmissionRate,
                averageQuizScore: classAverageQuizScore,
                classAttendancePercentage: classOverallAttendancePercent,
                totalSessions: totalSessionsCount,
                totalAssignments: classTasks.length,
                totalQuizzes: quizzes.length,
                needsAttentionCount: needsAttentionRoster.length
            },
            attendance: {
                overallPercentage: classOverallAttendancePercent,
                totalSessions: totalSessionsCount,
                presentCount: classTotalPresent,
                lateCount: classTotalLate,
                absentCount: classTotalAbsent,
                sessionTrend
            },
            assignments: {
                total: classTasks.length,
                submissionRate: classAssignmentSubmissionRate,
                averageGrade: classAverageAssignmentGrade,
                itemStats: assignmentItemStats
            },
            quizzes: {
                total: quizzes.length,
                averageScore: classAverageQuizScore,
                itemStats: quizItemStats
            },
            gradeDistribution: gradeBuckets,
            studentRoster,
            needsAttentionRoster
        });
    } catch (error) {
        console.error("getClassroomAnalytics error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

// =========================================================================
// 3. EXPORT CLASSROOM ANALYTICS (CSV)
// =========================================================================
exports.exportClassroomAnalyticsCSV = async (req, res) => {
    try {
        const { roomId } = req.params;
        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Forbidden: Unauthorized to export analytics." });
        }

        // Call internal aggregation
        const analyticsData = await new Promise((resolve, reject) => {
            const fakeRes = {
                status: (code) => ({
                    json: (data) => resolve(data)
                })
            };
            exports.getClassroomAnalytics(req, fakeRes).catch(reject);
        });

        if (!analyticsData.success) {
            return res.status(500).json({ success: false, message: "Failed to generate export data." });
        }

        const room = analyticsData.classroom;
        const roster = analyticsData.studentRoster || [];

        // Build CSV
        let csv = `Classroom: ${room.name} (${room.code})\n`;
        csv += `Subject: ${room.subject || 'N/A'}, Section: ${room.section || 'N/A'}\n`;
        csv += `Class Attendance: ${analyticsData.summary.classAttendancePercentage}%, Class Avg Grade: ${analyticsData.summary.classAverageGrade}%\n\n`;

        csv += "Student Name,Email,Attendance %,Assignment Completion %,Avg Assignment Grade,Avg Quiz Score,Missing Tasks,Late Tasks,Status,Attention Reasons\n";

        roster.forEach(s => {
            const reasons = (s.attentionReasons || []).join(" | ").replace(/"/g, '""');
            csv += `"${s.fullname}","${s.email}",${s.attendancePercentage}%,${s.assignmentCompletionRate}%,${s.averageAssignmentGrade}%,${s.averageQuizScore}%,${s.missingAssignmentsCount},${s.lateAssignmentsCount},"${s.status}","${reasons}"\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="analytics_${room.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error("exportClassroomAnalyticsCSV error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// =========================================================================
// 4. EXISTING CONCEPT MASTERY ANALYTICS (Preserved)
// =========================================================================
exports.getStudentMastery = async (req, res) => {
    try {
        const { id: studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, message: "Invalid student ID format." });
        }

        // Privacy check: Students can only view their own mastery
        if (req.user.role === "student" && req.user._id.toString() !== studentId.toString()) {
            return res.status(403).json({ success: false, message: "Forbidden: Cannot access another student's mastery data." });
        }

        const studentObjectId = new mongoose.Types.ObjectId(studentId);

        const masteryData = await AssessmentSubmission.aggregate([
            { $match: { studentId: studentObjectId } },
            { $lookup: { from: "assessments", localField: "assessmentId", foreignField: "_id", as: "assessment" } },
            { $unwind: "$assessment" },
            { $unwind: "$answers" },
            {
                $addFields: {
                    matchedQuestion: {
                        $first: {
                            $filter: {
                                input: "$assessment.questions",
                                as: "q",
                                cond: { $eq: ["$$q.questionId", "$answers.questionId"] }
                            }
                        }
                    }
                }
            },
            { $match: { matchedQuestion: { $ne: null } } },
            {
                $group: {
                    _id: "$matchedQuestion.topicTag",
                    topicTag: { $first: "$matchedQuestion.topicTag" },
                    totalEarnedScore: { $sum: "$answers.marksObtained" },
                    totalPossibleScore: { $sum: { $ifNull: ["$matchedQuestion.weightage", 1] } },
                    totalQuestions: { $sum: 1 },
                    correctCount: {
                        $sum: { $cond: [{ $eq: ["$answers.isCorrect", true] }, 1, 0] }
                    },
                    averageTimeSpent: { $avg: "$answers.timeSpentSeconds" },
                    bloomLevels: { $addToSet: "$matchedQuestion.bloomTaxonomy" }
                }
            },
            {
                $project: {
                    _id: 0,
                    topicTag: 1,
                    totalEarnedScore: 1,
                    totalPossibleScore: 1,
                    totalQuestions: 1,
                    correctCount: 1,
                    averageTimeSpent: { $round: ["$averageTimeSpent", 1] },
                    bloomLevels: 1,
                    masteryPercentage: {
                        $round: [
                            {
                                $cond: [
                                    { $gt: ["$totalPossibleScore", 0] },
                                    { $multiply: [{ $divide: ["$totalEarnedScore", "$totalPossibleScore"] }, 100] },
                                    0
                                ]
                            },
                            2
                        ]
                    }
                }
            },
            { $sort: { masteryPercentage: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            studentId,
            totalConceptsEvaluated: masteryData.length,
            data: masteryData
        });
    } catch (error) {
        console.error("Error computing student concept mastery:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch student mastery analytics.",
            error: error.message
        });
    }
};
