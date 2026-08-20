const mongoose = require("mongoose");

const formCollaboratorSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['editor', 'reviewer', 'viewer'],
        required: true,
        default: 'viewer'
    },
    permissions: [{
        type: String,
        trim: true
    }],
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

formCollaboratorSchema.index({ formId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("FormCollaborator", formCollaboratorSchema);
