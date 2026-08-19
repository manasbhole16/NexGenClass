const mongoose = require("mongoose");

const answerSubSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true
    },
    selectedOption: {
        type: Number,
        default: null
    },
    timeSpentSeconds: {
        type: Number,
        default: 0,
        min: 0
    },
    isCorrect: {
        type: Boolean,
        default: false
    },
    marksObtained: {
        type: Number,
        default: 0
    }
}, { _id: false });

const telemetrySchema = new mongoose.Schema({
    tabSwitchCount: {
        type: Number,
        default: 0,
        min: 0
    },
    fullscreenExitCount: {
        type: Number,
        default: 0,
        min: 0
    },
    blurDurationSeconds: {
        type: Number,
        default: 0,
        min: 0
    },
    submissionTimestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const assessmentSubmissionSchema = new mongoose.Schema({
    assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: [true, "Assessment ID is required"]
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "Student ID is required"]
    },
    answers: [answerSubSchema],
    totalScore: {
        type: Number,
        required: true,
        default: 0
    },
    maxScore: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    telemetry: {
        type: telemetrySchema,
        required: true,
        default: () => ({})
    }
}, { 
    timestamps: true 
});

// Index to quickly look up submissions by student and assessment
assessmentSubmissionSchema.index({ assessmentId: 1, studentId: 1 });
assessmentSubmissionSchema.index({ studentId: 1 });

module.exports = mongoose.model("AssessmentSubmission", assessmentSubmissionSchema);
