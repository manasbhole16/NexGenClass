const mongoose = require("mongoose");

function deliveryChannelSchema() {
    return {
        status: { type: String, enum: ["none", "queued", "sending", "sent", "delivered", "failed", "skipped"], default: "none" },
        attempts: { type: Number, default: 0 },
        nextAttemptAt: { type: Date, default: null },
        lastAttemptAt: { type: Date, default: null },
        sentAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        messageId: { type: String, default: null },
        error: { type: String, default: null }
    };
}

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
                // Classroom & Membership
                "classroom_created",
                "classroom_updated",
                "classroom_invitation",
                "classroom_joined",
                "classroom_removed",
                "class_joined",
                "class_left",
                "teacher_added",
                "student_joined",
                "student_removed",
                "classroom_announcement",
                // Classwork / Assignments
                "assignment_created",
                "assignment_published",
                "assignment_updated",
                "assignment_due_soon",
                "assignment_overdue",
                "assignment_submitted",
                "assignment_resubmitted",
                "assignment_returned",
                "assignment_graded",
                "assignment_feedback",
                // Quizzes & Assessments
                "quiz_created",
                "quiz_published",
                "quiz_scheduled",
                "quiz_available",
                "quiz_due_soon",
                "quiz_submitted",
                "quiz_graded",
                "quiz_returned",
                "quiz_evaluation_pending",
                "quiz_results_released",
                "quiz_closed",
                // Forms
                "form_created",
                "form_published",
                "form_due_soon",
                "form_response_submitted",
                "form_graded",
                "form_closed",
                "form_archived",
                "form_collaborator_added",
                "form_collaborator_removed",
                "form_access_granted",
                "form_access_revoked",
                "form_response_flagged",
                "form_response_reviewed",
                // Stream / Announcements
                "announcement_created",
                "announcement_updated",
                "announcement_comment",
                "announcement_reply",
                // Attendance
                "attendance_marked",
                "attendance_low",
                "attendance_warning",
                "attendance_updated",
                "attendance_session",
                // Calendar / Tasks
                "task_created",
                "task_due_soon",
                "task_overdue",
                "task_completed",
                "calendar_event",
                "calendar_event_created",
                "calendar_event_updated",
                // Live Class
                "live_class_scheduled",
                "live_class_starting",
                "live_class_started",
                "live_class_cancelled",
                // Analytics
                "academic_attention",
                "attendance_threshold",
                "performance_change",
                // Account
                "account_welcome",
                "account_updated",
                "account_security",
                // Schedule changes / extra reminders
                "assignment_updated_deadline",
                "quiz_updated",
                "quiz_schedule_changed",
                "quiz_starting_soon",
                "attendance_low_threshold",
                // System
                "general",
                "system"
            ],
            index: true
        },
        category: {
            type: String,
            enum: ["assignment", "quiz", "attendance", "announcement", "classroom", "calendar", "live_class", "analytics", "form", "account", "system"],
            default: "system",
            index: true
        },
        channels: {
            type: [String],
            enum: ["inApp", "email", "sms"],
            default: ["inApp"]
        },
        // Independent per-channel delivery tracking.
        // status: queued -> sending -> sent (provider accepted) -> delivered (provider-confirmed; in-app is delivered on persist)
        //         failed (retries exhausted / permanent) | skipped (disabled, not configured, no address)
        deliveryStatus: {
            inApp: deliveryChannelSchema(),
            email: deliveryChannelSchema(),
            sms: deliveryChannelSchema()
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
        priority: {
            type: String,
            enum: ["low", "normal", "high", "urgent"],
            default: "normal",
            index: true
        },
        entityType: {
            type: String,
            enum: [
                "task", 
                "submission", 
                "quiz", 
                "attempt", 
                "form", 
                "attendance", 
                "announcement", 
                "room", 
                "calendar", 
                "analytics", 
                "live_session", 
                "system"
            ],
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
        actionUrl: {
            type: String,
            default: null
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

// Compound indexes for optimal querying and deduplication
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ roomId: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
// Delivery worker lookups
notificationSchema.index({ "deliveryStatus.email.status": 1, "deliveryStatus.email.nextAttemptAt": 1 });
notificationSchema.index({ "deliveryStatus.sms.status": 1, "deliveryStatus.sms.nextAttemptAt": 1 });
// Hard duplicate guard: one notification per (recipient, dedupKey)
notificationSchema.index(
    { recipient: 1, dedupKey: 1 },
    { unique: true, partialFilterExpression: { dedupKey: { $type: "string" } }, name: "recipient_dedupKey_unique" }
);

module.exports = mongoose.model("Notification", notificationSchema);
