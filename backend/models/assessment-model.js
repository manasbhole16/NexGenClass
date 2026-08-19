const mongoose = require("mongoose");

const questionSubSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    text: {
        type: String,
        required: [true, "Question text is required"],
        trim: true
    },
    topicTag: {
        type: String,
        required: [true, "Topic tag is required (e.g. Dynamic_Programming, Binary_Trees)"],
        trim: true
    },
    bloomTaxonomy: {
        type: String,
        enum: ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'],
        required: [true, "Bloom's Taxonomy cognitive level is required"]
    },
    options: {
        type: [String],
        validate: {
            validator: (v) => Array.isArray(v) && v.length >= 2,
            message: "A minimum of 2 options are required"
        },
        required: true
    },
    correctOptionIndex: {
        type: Number,
        required: [true, "Index of the correct option is required"],
        min: 0
    },
    weightage: {
        type: Number,
        default: 1,
        min: 1
    }
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Assessment title is required"],
        trim: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, "Course or Room ID is required"]
    },
    durationMinutes: {
        type: Number,
        required: [true, "Duration in minutes is required"],
        min: 1
    },
    questions: {
        type: [questionSubSchema],
        validate: {
            validator: (q) => Array.isArray(q) && q.length > 0,
            message: "Assessment must contain at least one question"
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("Assessment", assessmentSchema);
