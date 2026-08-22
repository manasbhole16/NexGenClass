const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timeLimit: { type: Number, required: true, min: 1 }, // in minutes
    totalMarks: { type: Number, required: true, min: 0 },
    passingMarks: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null }, // Start availability date/time
    deadline: { type: Date, required: true },
    status: {
        type: String,
        enum: ['draft', 'published', 'scheduled', 'closed'],
        default: 'draft'
    },
    isPublished: { type: Boolean, default: false },
    topic: { type: String, default: "General", trim: true },
    shuffleQuestions: { type: Boolean, default: false },
    allowedAttempts: { type: Number, default: 1, min: 1 },
    showResultsImmediately: { type: Boolean, default: true },
    resultVisibility: {
        type: String,
        enum: ['immediate', 'manual_release', 'scheduled_release'],
        default: 'immediate'
    },
    resultReleaseDate: { type: Date, default: null },
    isResultsReleased: { type: Boolean, default: false },
    safeMode: { type: Boolean, default: false }, // Exam monitoring mode (tab-switch tracking)
    scheduledAt: { type: Date, default: null }
}, { timestamps: true });

quizSchema.index({ roomId: 1, isPublished: 1 });
quizSchema.index({ roomId: 1, deadline: 1 });
quizSchema.index({ roomId: 1, topic: 1 });

module.exports = mongoose.model("Quiz", quizSchema);
