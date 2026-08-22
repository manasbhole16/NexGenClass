const mongoose = require("mongoose");

const formAuditLogSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true,
        index: true
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        trim: true
    },
    targetType: {
        type: String,
        trim: true,
        default: 'form'
    },
    targetId: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    }
}, { timestamps: { createdAt: true, updatedAt: false } });

formAuditLogSchema.index({ formId: 1, createdAt: -1 });

module.exports = mongoose.model("FormAuditLog", formAuditLogSchema);
