const Submission = require("../models/submission-model");
const Task = require("../models/task-model");

// Submit Assignment
module.exports.submitAssignment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content, roomId } = req.body;
        const studentId = req.user._id;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Check if late
        const isLate = task.dueDate && new Date() > new Date(task.dueDate);
        const status = isLate ? 'late' : 'submitted';

        const submission = await Submission.findOneAndUpdate(
            { taskId, studentId },
            { 
                roomId, 
                content, 
                status, 
                submittedAt: new Date() 
            },
            { new: true, upsert: true }
        );

        if (req.io) req.io.emit("submissionUpdate", submission);

        res.json({ success: true, submission });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Submissions for a Task (Teacher)
module.exports.getSubmissionsForTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const submissions = await Submission.find({ taskId }).populate('studentId', 'fullname email');
        res.json({ success: true, submissions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Student's Submissions in a Room
module.exports.getStudentSubmissions = async (req, res) => {
    try {
        const { roomId } = req.query;
        const submissions = await Submission.find({ studentId: req.user._id, roomId });
        res.json({ success: true, submissions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Grade Submission
module.exports.gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { marksAwarded, teacherFeedback } = req.body;

        const submission = await Submission.findByIdAndUpdate(
            id,
            { marksAwarded, teacherFeedback, status: 'graded' },
            { new: true }
        );

        if (!submission) return res.status(404).json({ message: "Submission not found" });

        if (req.io) req.io.emit("submissionUpdate", submission);

        res.json({ success: true, submission });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Upload File for Assignment
module.exports.uploadFile = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { roomId, content } = req.body;
        const studentId = req.user._id;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const isLate = task.dueDate && new Date() > new Date(task.dueDate);
        const status = isLate ? 'late' : 'submitted';

        const fileUrl = `/uploads/${req.file.filename}`;
        const fileName = req.file.originalname;

        const submission = await Submission.findOneAndUpdate(
            { taskId, studentId },
            { 
                roomId, 
                content,
                status, 
                fileUrl,
                fileName,
                submittedAt: new Date() 
            },
            { new: true, upsert: true }
        );

        if (req.io) req.io.emit("submissionUpdate", submission);

        res.json({ success: true, submission });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
