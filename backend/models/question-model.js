const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: {
        type: String,
        enum: ['mcq', 'true_false', 'short_answer'],
        default: 'mcq'
    },
    questionText: { type: String, required: true },
    options: [{
        text: { type: String }
    }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed }, // Number for mcq/true_false, String for short_answer (optional)
    referenceAnswer: { type: String, trim: true }, // For short answers
    marks: { type: Number, required: true, default: 1 },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    explanation: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);
