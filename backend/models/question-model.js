const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    type: {
        type: String,
        enum: ['mcq', 'multiple_select', 'true_false', 'short_answer'],
        default: 'mcq'
    },
    questionText: { type: String, required: true, trim: true },
    options: [{
        text: { type: String, trim: true }
    }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed }, // Number for mcq/true_false, [Number] for multiple_select, String for short_answer
    referenceAnswer: { type: String, trim: true }, // For short answers
    marks: { type: Number, required: true, default: 1, min: 0 },
    order: { type: Number, default: 0 },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    explanation: { type: String, trim: true }
}, { timestamps: true });

questionSchema.index({ quizId: 1, order: 1 });

module.exports = mongoose.model("Question", questionSchema);
