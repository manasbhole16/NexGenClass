const Submission = require("../models/submission-model");
const Task = require("../models/task-model");
const Room = require("../models/room-model");
const notificationService = require("../services/notificationService");

// Submit / Turn In / Unsubmit Assignment
module.exports.submitAssignment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content, roomId, attachments, unsubmit } = req.body;
        const studentId = req.user._id;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Verify Student Enrolled
        if (task.room) {
            const room = await Room.findById(task.room);
            if (!room) return res.status(404).json({ message: "Classroom not found" });
            const isMember = room.members.some(m => m.toString() === studentId.toString());
            if (!isMember) {
                return res.status(403).json({ message: "You are not enrolled in this classroom." });
            }
        }

        // Handle Unsubmit Action
        if (unsubmit) {
            const existing = await Submission.findOne({ taskId, studentId });
            if (!existing) {
                return res.status(404).json({ message: "No submission to unsubmit." });
            }
            if (existing.status === 'graded') {
                return res.status(400).json({ message: "Cannot unsubmit work that has already been graded." });
            }

            existing.status = 'unsubmitted';
            existing.unsubmittedAt = new Date();
            await existing.save();

            if (req.io && task.room) {
                req.io.to(task.room.toString()).emit("submissionUpdate", existing);
            }

            return res.json({ success: true, submission: existing, message: "Assignment unsubmitted." });
        }

        // Check if late
        const isLate = task.dueDate && new Date() > new Date(task.dueDate);
        const status = isLate ? 'late' : 'submitted';

        // Prepare attachments array
        let safeAttachments = [];
        if (Array.isArray(attachments)) {
            safeAttachments = attachments.map(a => ({
                fileUrl: a.fileUrl || a.url || '',
                fileName: a.fileName || a.title || 'Attachment',
                fileType: a.fileType || 'file',
                uploadedAt: a.uploadedAt ? new Date(a.uploadedAt) : new Date()
            })).filter(a => a.fileUrl);
        }

        const updateData = {
            roomId: task.room || roomId,
            content: (content || '').trim(),
            status,
            submittedAt: new Date(),
            unsubmittedAt: null
        };

        if (safeAttachments.length > 0) {
            updateData.attachments = safeAttachments;
            // Legacy backward compatibility
            updateData.fileUrl = safeAttachments[0].fileUrl;
            updateData.fileName = safeAttachments[0].fileName;
        }

        const existingSubmission = await Submission.findOne({ taskId, studentId });
        const isResubmit = existingSubmission && (existingSubmission.status === 'unsubmitted' || existingSubmission.status === 'graded');

        const submission = await Submission.findOneAndUpdate(
            { taskId, studentId },
            updateData,
            { new: true, upsert: true }
        ).populate('studentId', 'fullname email');

        if (req.io && task.room) {
            req.io.to(task.room.toString()).emit("submissionUpdate", submission);
        }

        // Notify room owner / teacher
        if (task.room) {
            const room = await Room.findById(task.room);
            if (room && room.owner && room.owner.toString() !== studentId.toString()) {
                await notificationService.createNotification({
                    recipient: room.owner,
                    actor: studentId,
                    type: isResubmit ? "assignment_resubmitted" : "assignment_submitted",
                    title: isResubmit ? "Assignment Resubmitted" : "Assignment Submitted",
                    message: `${req.user.fullname} ${isResubmit ? 'resubmitted' : 'submitted'} "${task.title}".`,
                    entityType: "submission",
                    entityId: submission._id,
                    roomId: room._id,
                    metadata: { taskId: task._id, submissionId: submission._id },
                    io: req.io
                });
            }
        }

        res.json({ success: true, submission });
    } catch (err) {
        console.error("Submit error:", err);
        res.status(500).json({ message: err.message });
    }
};

// Upload Files for Assignment (Supports multiple files up to 5)
module.exports.uploadFile = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { roomId, content } = req.body;
        const studentId = req.user._id;

        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const isLate = task.dueDate && new Date() > new Date(task.dueDate);
        const status = isLate ? 'late' : 'submitted';

        // Convert all uploaded buffers to Base64 Data URIs
        const newAttachments = files.map(file => {
            const base64Data = file.buffer.toString('base64');
            const fileUrl = `data:${file.mimetype};base64,${base64Data}`;
            return {
                fileUrl,
                fileName: file.originalname,
                fileType: file.mimetype,
                uploadedAt: new Date()
            };
        });

        // Find existing submission to append attachments if needed
        let existing = await Submission.findOne({ taskId, studentId });
        let combinedAttachments = newAttachments;

        if (existing && Array.isArray(existing.attachments) && existing.attachments.length > 0) {
            combinedAttachments = [...existing.attachments, ...newAttachments].slice(-5); // max 5
        }

        const submission = await Submission.findOneAndUpdate(
            { taskId, studentId },
            {
                roomId: task.room || roomId,
                content: content !== undefined ? content : (existing?.content || ''),
                status,
                attachments: combinedAttachments,
                // Legacy fields
                fileUrl: combinedAttachments[0]?.fileUrl || '',
                fileName: combinedAttachments[0]?.fileName || '',
                submittedAt: new Date(),
                unsubmittedAt: null
            },
            { new: true, upsert: true }
        ).populate('studentId', 'fullname email');

        if (req.io && task.room) {
            req.io.to(task.room.toString()).emit("submissionUpdate", submission);
        }

        res.json({ success: true, submission });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: err.message });
    }
};

// Get Submissions for a Task (Teacher Only)
module.exports.getSubmissionsForTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (task.room) {
            const room = await Room.findById(task.room);
            const isOwner = room && room.owner?.toString() === req.user._id.toString();
            const isTaskOwner = task.owner && task.owner.toString() === req.user._id.toString();
            const isRoomTeacher = req.user.role === 'teacher' && room && (isOwner || room.members.some(m => m.toString() === req.user._id.toString()));

            if (!isOwner && !isTaskOwner && !isRoomTeacher) {
                return res.status(403).json({ message: "Forbidden: Only classroom instructors can view all student submissions." });
            }
        }

        const submissions = await Submission.find({ taskId })
            .populate('studentId', 'fullname email role');

        res.json({ success: true, submissions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Student's Submissions in a Room
module.exports.getStudentSubmissions = async (req, res) => {
    try {
        const { roomId } = req.query;
        let query = { studentId: req.user._id };
        if (roomId && roomId !== 'all') {
            query.roomId = roomId;
        }
        const submissions = await Submission.find(query)
            .populate('roomId', 'name code')
            .populate('taskId', 'title maxMarks dueDate topic rubric');

        res.json({ success: true, submissions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Grade Submission with Rubric & Overall Feedback (Teacher Only)
module.exports.gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { marksAwarded, teacherFeedback, grade, feedback, rubricEvaluation } = req.body;

        const submission = await Submission.findById(id);
        if (!submission) return res.status(404).json({ message: "Submission not found" });

        const task = await Task.findById(submission.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Server-Side RBAC Check
        if (task.room) {
            const room = await Room.findById(task.room);
            const isOwner = room && room.owner?.toString() === req.user._id.toString();
            const isTaskOwner = task.owner && task.owner.toString() === req.user._id.toString();
            const isRoomTeacher = req.user.role === 'teacher' && room && (isOwner || room.members.some(m => m.toString() === req.user._id.toString()));

            if (!isOwner && !isTaskOwner && !isRoomTeacher) {
                return res.status(403).json({ message: "Forbidden: Only classroom instructors can grade student submissions." });
            }
        } else {
            if (task.owner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Forbidden: You are not authorized to grade this submission." });
            }
        }

        let calculatedMarks = marksAwarded !== undefined ? Number(marksAwarded) : (grade !== undefined ? Number(grade) : null);
        let safeRubricEvaluation = [];

        // If Rubric Evaluation is provided, validate and calculate total securely
        if (Array.isArray(rubricEvaluation) && rubricEvaluation.length > 0) {
            let sumScore = 0;
            safeRubricEvaluation = rubricEvaluation.map(item => {
                const max = Number(item.maxPoints) || 0;
                const awarded = Math.min(Math.max(0, Number(item.pointsAwarded) || 0), max);
                sumScore += awarded;
                return {
                    criterion: String(item.criterion || '').trim(),
                    pointsAwarded: awarded,
                    maxPoints: max,
                    feedback: String(item.feedback || '').trim()
                };
            });
            calculatedMarks = sumScore;
        }

        const finalFeedback = (teacherFeedback || feedback || '').trim();

        submission.marksAwarded = calculatedMarks;
        submission.grade = calculatedMarks !== null ? String(calculatedMarks) : '';
        submission.teacherFeedback = finalFeedback;
        submission.feedback = finalFeedback;
        submission.rubricEvaluation = safeRubricEvaluation;
        submission.status = 'graded';
        submission.gradedAt = new Date();
        submission.returnedAt = new Date();
        submission.gradedBy = req.user._id;

        await submission.save();
        await submission.populate('studentId', 'fullname email');

        if (req.io && task.room) {
            req.io.to(task.room.toString()).emit("submissionUpdate", submission);
        }

        // Notify student of graded assignment
        if (submission.studentId) {
            const studentRecipientId = submission.studentId._id || submission.studentId;
            await notificationService.createNotification({
                recipient: studentRecipientId,
                actor: req.user._id,
                type: "assignment_graded",
                title: "Assignment Graded",
                message: `Your assignment "${task.title}" has been graded: ${calculatedMarks !== null ? calculatedMarks : ''} / ${task.maxMarks || 100} pts.`,
                entityType: "submission",
                entityId: submission._id,
                roomId: task.room,
                metadata: { taskId: task._id, submissionId: submission._id, marks: calculatedMarks, maxMarks: task.maxMarks },
                io: req.io
            });
        }

        res.json({ success: true, submission });
    } catch (err) {
        console.error("Grading Error:", err);
        res.status(500).json({ message: err.message });
    }
};
