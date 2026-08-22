const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOption: { type: Number, default: null }, // Index for mcq / true_false
    selectedOptions: { type: [Number], default: [] }, // Array of indices for multiple_select
    textAnswer: { type: String, trim: true, default: '' }, // For short_answer, long_answer, fill_blank
    marksAwarded: { type: Number, default: 0 },
    feedback: { type: String, trim: true, default: '' }
}, { _id: false });

const suspiciousEventSchema = new mongoose.Schema({
    eventType: { type: String, required: true }, // 'tab_switch', 'window_blur', 'fullscreen_exit', 'paste_attempt'
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    gradedAt: { type: Date, default: null },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'graded', 'expired'],
        default: 'in_progress'
    },
    attemptNumber: { type: Number, default: 1 },
    timeSpentSeconds: { type: Number, default: 0 },
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    flaggedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    answers: [answerSchema],
    score: { type: Number, required: true, default: 0 },
    objectiveMarks: { type: Number, default: 0 },
    subjectiveMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    isEvaluated: { type: Boolean, default: false },
    teacherFeedback: { type: String, trim: true, default: '' },
    suspiciousEvents: [suspiciousEventSchema] // Safe Mode telemetry events
}, { timestamps: true });

attemptSchema.index({ quizId: 1, studentId: 1 });
attemptSchema.index({ roomId: 1, studentId: 1 });

module.exports = mongoose.model("Attempt", attemptSchema);
