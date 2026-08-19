const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        type: {
            type: String,
            required: true,
            enum: [
                // Classroom
                "classroom_invitation",
                "classroom_joined",
                "classroom_removed",
                "classroom_announcement",
                // Classwork / Assignments
                "assignment_created",
                "assignment_updated",
                "assignment_due_soon",
                "assignment_overdue",
                "assignment_submitted",
                "assignment_resubmitted",
                "assignment_returned",
                "assignment_graded",
                "assignment_feedback",
                // Quizzes
                "quiz_published",
                "quiz_scheduled",
                "quiz_due_soon",
                "quiz_submitted",
                "quiz_graded",
                "quiz_returned",
                "quiz_evaluation_pending",
                // Forms
                "form_published",
                "form_response_submitted",
                "form_graded",
                // Stream / Announcements
                "announcement_created",
                "announcement_comment",
                "announcement_reply",
                // System
                "general",
                "system"
            ],
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        entityType: {
            type: String,
            enum: ["task", "submission", "quiz", "attempt", "form", "announcement", "room", "system"],
            default: "system"
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            default: null,
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true
        },
        readAt: {
            type: Date,
            default: null
        },
        dedupKey: {
            type: String,
            index: true,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Compound indexes for optimal queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
