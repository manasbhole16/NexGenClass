const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    description: { 
        type: String, 
        trim: true, 
        default: "" 
    },
    roomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Room', 
        required: true
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    topic: { 
        type: String, 
        default: "General", 
        trim: true 
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'draft'
    },
    startAt: { 
        type: Date, 
        default: null 
    },
    endAt: { 
        type: Date, 
        default: null 
    },
    allowResponseEditing: { 
        type: Boolean, 
        default: false 
    },
    limitOneResponse: { 
        type: Boolean, 
        default: true 
    },
    collectEmail: { 
        type: Boolean, 
        default: true 
    },
    showResultsImmediately: {
        type: Boolean,
        default: true
    },
    totalMarks: {
        type: Number,
        default: 0,
        min: 0
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    archived: {
        type: Boolean,
        default: false
    },
    sections: [{
        sectionId: {
            type: String,
            default: () => new mongoose.Types.ObjectId().toString()
        },
        title: {
            type: String,
            default: 'Untitled Section',
            trim: true
        },
        description: {
            type: String,
            default: '',
            trim: true
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    confirmationMessage: {
        type: String,
        default: 'Your response has been recorded.',
        trim: true
    },
    submitButtonText: {
        type: String,
        default: 'Submit',
        trim: true
    },
    showProgressBar: {
        type: Boolean,
        default: true
    },
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleOptions: {
        type: Boolean,
        default: false
    },
    allowDraftSaving: {
        type: Boolean,
        default: true
    },
    requireClassroomMembership: {
        type: Boolean,
        default: true
    },
    // Phase 6 Sharing & Access Fields
    sharingEnabled: {
        type: Boolean,
        default: true
    },
    sharingMode: {
        type: String,
        enum: ['classroom', 'selected_users', 'link', 'restricted'],
        default: 'classroom'
    },
    shareToken: {
        type: String,
        default: null,
        trim: true
    },
    shareTokenExpiresAt: {
        type: Date,
        default: null
    },
    allowExternalAccess: {
        type: Boolean,
        default: false
    },
    requireAuthentication: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

formSchema.index({ roomId: 1, status: 1 });
formSchema.index({ roomId: 1, createdAt: -1 });
formSchema.index({ roomId: 1, archived: 1, isTemplate: 1, status: 1 });
formSchema.index({ shareToken: 1 });

module.exports = mongoose.model("Form", formSchema);
