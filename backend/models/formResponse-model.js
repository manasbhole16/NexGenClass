const mongoose = require("mongoose");

const formResponseSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true,
        index: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FormQuestion',
            required: true
        },
        textAnswer: {
            type: String,
            default: '',
            trim: true
        },
        selectedOption: {
            type: String,
            default: '',
            trim: true
        },
        selectedOptions: [{
            type: String,
            trim: true
        }],
        scaleValue: {
            type: Number,
            default: null
        },
        dateAnswer: {
            type: String,
            default: '',
            trim: true
        },
        timeAnswer: {
            type: String,
            default: '',
            trim: true
        },
        fileAnswer: {
            fileUrl: { type: String, default: '', trim: true },
            fileName: { type: String, default: '', trim: true },
            fileSize: { type: Number, default: 0 },
            mimeType: { type: String, default: '', trim: true },
            uploadedAt: { type: Date, default: null }
        },
        sectionId: {
            type: String,
            default: 'default',
            trim: true
        },
        awardedMarks: {
            type: Number,
            default: 0,
            min: 0
        },
        maxMarks: {
            type: Number,
            default: 1,
            min: 0
        },
        isCorrect: {
            type: Boolean,
            default: false
        },
        feedback: {
            type: String,
            default: '',
            trim: true
        },
        isGraded: {
            type: Boolean,
            default: false
        }
    }],
    objectiveMarks: {
        type: Number,
        default: 0
    },
    subjectiveMarks: {
        type: Number,
        default: 0
    },
    score: {
        type: Number,
        default: 0
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    gradingStatus: {
        type: String,
        enum: ['pending', 'partially_graded', 'graded'],
        default: 'pending'
    },
    gradedAt: {
        type: Date,
        default: null
    },
    evaluatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['submitted', 'draft'],
        default: 'submitted'
    },
    draftSavedAt: {
        type: Date,
        default: null
    },
    timeSpentSeconds: {
        type: Number,
        default: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    // Phase 6 Response Moderation Fields
    reviewStatus: {
        type: String,
        enum: ['pending', 'reviewed', 'flagged', 'hidden'],
        default: 'pending'
    },
    flagged: {
        type: Boolean,
        default: false
    },
    hidden: {
        type: Boolean,
        default: false
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    internalNote: {
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

// Compound indexes
formResponseSchema.index({ formId: 1, studentId: 1, status: 1 });
formResponseSchema.index({ formId: 1, status: 1 });
formResponseSchema.index({ formId: 1, reviewStatus: 1 });
formResponseSchema.index({ formId: 1, flagged: 1 });
formResponseSchema.index({ formId: 1, hidden: 1 });
formResponseSchema.index({ formId: 1, createdAt: -1 });
formResponseSchema.index({ roomId: 1, studentId: 1 });

module.exports = mongoose.model("FormResponse", formResponseSchema);
