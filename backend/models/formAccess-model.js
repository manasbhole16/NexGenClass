const mongoose = require("mongoose");

const formAccessSchema = new mongoose.Schema({
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
    accessType: {
        type: String,
        enum: ['student', 'teacher', 'link'],
        default: 'student'
    },
    grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

formAccessSchema.index({ formId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("FormAccess", formAccessSchema);
