const notificationService = require("../services/notificationService");
const delivery = require("../services/notificationDelivery.service");
const logger = require("../utils/logger");

const fail = (res, err, fallback = 500) => {
    const status = err.status || fallback;
    if (status >= 500) logger.error("notification.api_error", { error: err.message });
    res.status(status).json({ success: false, message: status >= 500 ? "Something went wrong" : err.message });
};

module.exports.getNotifications = async (req, res) => {
    try {
        const { page, limit, unreadOnly, readOnly, type, category, priority, roomId } = req.query;
        const result = await notificationService.getUserNotifications(req.user._id, { page, limit, unreadOnly, readOnly, type, category, priority, roomId });
        res.json({ success: true, ...result });
    } catch (err) { fail(res, err); }
};

module.exports.getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await notificationService.getUnreadCount(req.user._id);
        res.json({ success: true, count: unreadCount, unreadCount });
    } catch (err) { fail(res, err); }
};

module.exports.markAsRead = async (req, res) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id, req.user._id, req.io);
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
        res.json({ success: true, notification });
    } catch (err) { fail(res, err, 400); }
};

module.exports.markAllAsRead = async (req, res) => {
    try {
        const modifiedCount = await notificationService.markAllAsRead(req.user._id, (req.body || {}).roomId, req.io);
        res.json({ success: true, message: "All notifications marked as read", modifiedCount });
    } catch (err) { fail(res, err); }
};

module.exports.deleteNotification = async (req, res) => {
    try {
        const deleted = await notificationService.deleteNotification(req.params.id, req.user._id, req.io);
        if (!deleted) return res.status(404).json({ success: false, message: "Notification not found" });
        res.json({ success: true, message: "Notification deleted successfully" });
    } catch (err) { fail(res, err, 400); }
};

module.exports.clearReadNotifications = async (req, res) => {
    try {
        const deletedCount = await notificationService.clearReadNotifications(req.user._id, req.io);
        res.json({ success: true, message: "Read notifications cleared", deletedCount });
    } catch (err) { fail(res, err); }
};

module.exports.clearAllNotifications = async (req, res) => {
    try {
        const deletedCount = await notificationService.clearAllNotifications(req.user._id, req.io);
        res.json({ success: true, message: "All notifications cleared", deletedCount });
    } catch (err) { fail(res, err); }
};

module.exports.getPreferences = async (req, res) => {
    try {
        const result = await notificationService.getPreferences(req.user._id);
        if (!result) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, ...result });
    } catch (err) { fail(res, err); }
};

module.exports.updatePreferences = async (req, res) => {
    try {
        const result = await notificationService.updatePreferences(req.user._id, req.body || {});
        if (!result) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, message: "Preferences updated", ...result });
    } catch (err) { fail(res, err, 500); }
};

// Scheduler hook for serverless hosts (e.g. Vercel Cron). Protected by CRON_SECRET, not by user auth.
module.exports.runScheduledJobs = async (req, res) => {
    try {
        const secret = process.env.CRON_SECRET;
        const given = (req.headers.authorization || "").replace(/^Bearer /, "");
        if (!secret || given !== secret) return res.status(401).json({ success: false, message: "Unauthorized" });
        const { runAllReminders } = require("../jobs/reminderJobs");
        const reminders = await runAllReminders(req.io);
        const processed = await delivery.processDueDeliveries(100);
        res.json({ success: true, reminders, deliveriesProcessed: processed });
    } catch (err) { fail(res, err); }
};
