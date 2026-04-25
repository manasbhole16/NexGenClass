const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timeLimit: { type: Number, required: true }, // in minutes
    totalMarks: { type: Number, required: true },
    deadline: { type: Date, required: true },
    isPublished: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Quiz", quizSchema);
