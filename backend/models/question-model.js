const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
        type: String,
        enum: ['mcq', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'fill_blank'],
        default: 'mcq'
    },
    questionText: { type: String, required: true, trim: true },
    options: [{
        text: { type: String, trim: true }
    }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed }, // Number for mcq/true_false, [Number] for multiple_select, String/[String] for fill_blank/short_answer
    referenceAnswer: { type: String, trim: true }, // For short/long answers
    marks: { type: Number, required: true, default: 1, min: 0 },
    order: { type: Number, default: 0 },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    topic: { type: String, default: "General", trim: true },
    explanation: { type: String, trim: true },
    imageUrl: { type: String, default: '', trim: true },
    isBankQuestion: { type: Boolean, default: false } // Flag if saved to Question Bank
}, { timestamps: true });

questionSchema.index({ quizId: 1, order: 1 });
questionSchema.index({ roomId: 1, isBankQuestion: 1 });
questionSchema.index({ topic: 1, type: 1 });

module.exports = mongoose.model("Question", questionSchema);
