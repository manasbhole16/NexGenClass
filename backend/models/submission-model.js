const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    status: {
        type: String,
        enum: ['submitted', 'graded', 'late', 'draft', 'unsubmitted'],
        default: 'submitted'
    },
    content: { type: String, default: '' }, // Text response / notes
    fileUrl: { type: String, default: '' }, // Single file legacy
    fileName: { type: String, default: '' }, // Single file legacy
    attachments: [{
        fileUrl: { type: String, required: true },
        fileName: { type: String, default: '' },
        fileType: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    rubricEvaluation: [{
        criterion: { type: String, required: true },
        pointsAwarded: { type: Number, required: true, default: 0 },
        maxPoints: { type: Number, required: true, default: 0 },
        feedback: { type: String, default: '' }
    }],
    marksAwarded: { type: Number, default: null },
    teacherFeedback: { type: String, default: '' },
    grade: { type: String, default: '' },
    feedback: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    unsubmittedAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure a student can only have one submission document per task
submissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ roomId: 1, status: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
