const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timeLimit: { type: Number, required: true, min: 1 }, // in minutes
    totalMarks: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    topic: { type: String, default: "General", trim: true },
    shuffleQuestions: { type: Boolean, default: false },
    allowedAttempts: { type: Number, default: 1, min: 1 },
    showResultsImmediately: { type: Boolean, default: true },
    scheduledAt: { type: Date, default: null }
}, { timestamps: true });

quizSchema.index({ roomId: 1, isPublished: 1 });
quizSchema.index({ roomId: 1, deadline: 1 });

module.exports = mongoose.model("Quiz", quizSchema);
