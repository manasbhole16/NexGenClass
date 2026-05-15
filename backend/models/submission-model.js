const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    status: {
        type: String,
        enum: ['submitted', 'graded', 'late'],
        default: 'submitted'
    },
    content: { type: String }, // Optional text submission
    fileUrl: { type: String }, // Path to the uploaded file
    fileName: { type: String }, // Original file name
    marksAwarded: { type: Number, default: null },
    teacherFeedback: { type: String },
    grade: { type: String },
    feedback: { type: String },
    gradedAt: { type: Date },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure a student can only submit once per task
submissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
