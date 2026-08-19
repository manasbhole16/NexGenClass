const mongoose = require("mongoose");

const formQuestionSchema = new mongoose.Schema({
    formId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Form', 
        required: true, 
        index: true 
    },
    questionText: { 
        type: String, 
        required: true, 
        trim: true 
    },
    description: { 
        type: String, 
        default: '', 
        trim: true 
    },
    type: {
        type: String,
        enum: ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown'],
        required: true,
        default: 'short_answer'
    },
    options: [{
        text: { type: String, trim: true }
    }],
    required: { 
        type: Boolean, 
        default: false 
    },
    marks: {
        type: Number,
        default: 1,
        min: 0
    },
    correctAnswer: {
        type: String,
        default: '',
        trim: true
    },
    correctAnswers: [{
        type: String,
        trim: true
    }],
    order: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

formQuestionSchema.index({ formId: 1, order: 1 });

module.exports = mongoose.model("FormQuestion", formQuestionSchema);
