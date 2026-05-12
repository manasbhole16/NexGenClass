const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    questionText: { type: String, required: true },
    options: [{
        text: { type: String, required: true }
    }],
    correctAnswer: { type: Number, required: true }, // Index of the correct option
    marks: { type: Number, required: true, default: 1 },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    explanation: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);
