const notificationService = require("../services/notificationService");

// Get User Notifications (Paginated)
module.exports.getNotifications = async (req, res) => {
    try {
        const { page, limit, unreadOnly, type, roomId } = req.query;
        const result = await notificationService.getUserNotifications(req.user._id, {
            page,
            limit,
            unreadOnly,
            type,
            roomId
        });

        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get Unread Count
module.exports.getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await notificationService.getUnreadCount(req.user._id);
        res.json({ success: true, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Mark Single Notification as Read
module.exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await notificationService.markAsRead(id, req.user._id);
        
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found or access denied" });
        }

        res.json({ success: true, notification });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Mark All Notifications as Read
module.exports.markAllAsRead = async (req, res) => {
    try {
        const { roomId } = req.body;
        const modifiedCount = await notificationService.markAllAsRead(req.user._id, roomId);
        res.json({ success: true, message: "All notifications marked as read", modifiedCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Single Notification
module.exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await notificationService.deleteNotification(id, req.user._id);
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Notification not found or access denied" });
        }

        res.json({ success: true, message: "Notification deleted successfully" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Clear All Read Notifications
module.exports.clearReadNotifications = async (req, res) => {
    try {
        const deletedCount = await notificationService.clearReadNotifications(req.user._id);
        res.json({ success: true, message: "Read notifications cleared", deletedCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
