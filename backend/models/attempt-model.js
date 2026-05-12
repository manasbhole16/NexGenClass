const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        selectedOption: { type: Number }, // Index of the selected option, can be null if skipped or short answer
        textAnswer: { type: String } // For short answer
    }],
    score: { type: Number, required: true, default: 0 },
    isEvaluated: { type: Boolean, default: true },
    teacherFeedback: { type: String },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Attempt", attemptSchema);
