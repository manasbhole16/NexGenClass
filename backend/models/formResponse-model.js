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
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound indexes
formResponseSchema.index({ formId: 1, studentId: 1 });
formResponseSchema.index({ formId: 1, createdAt: -1 });
formResponseSchema.index({ roomId: 1, studentId: 1 });

module.exports = mongoose.model("FormResponse", formResponseSchema);
