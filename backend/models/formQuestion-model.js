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
        enum: ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown', 'linear_scale', 'date', 'time', 'file_upload'],
        required: true,
        default: 'short_answer'
    },
    sectionId: {
        type: String,
        default: 'default',
        trim: true
    },
    imageUrl: {
        type: String,
        default: '',
        trim: true
    },
    options: [{
        text: { type: String, trim: true }
    }],
    scaleConfig: {
        min: { type: Number, default: 1 },
        max: { type: Number, default: 5 },
        minLabel: { type: String, default: '', trim: true },
        maxLabel: { type: String, default: '', trim: true }
    },
    fileUploadConfig: {
        maxFileSizeMB: { type: Number, default: 10 },
        allowedTypes: [{ type: String, trim: true }]
    },
    validation: {
        enabled: { type: Boolean, default: false },
        ruleType: { 
            type: String, 
            enum: ['none', 'min_length', 'max_length', 'min_value', 'max_value', 'exact_value', 'regex', 'min_select', 'max_select', 'exact_select'],
            default: 'none'
        },
        value: { type: mongoose.Schema.Types.Mixed, default: null },
        customError: { type: String, default: '', trim: true }
    },
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
formQuestionSchema.index({ formId: 1, sectionId: 1 });

module.exports = mongoose.model("FormQuestion", formQuestionSchema);
