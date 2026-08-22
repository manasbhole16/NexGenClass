const Notification = require("../models/notification-model");
const User = require("../models/user-model");
const Room = require("../models/room-model");
const mongoose = require("mongoose");

class NotificationService {
    /**
     * Create and dispatch a single notification with deduplication and recipient Socket.IO emission
     */
    async createNotification({
        recipient,
        actor = null,
        type,
        title,
        message,
        priority = "normal",
        entityType = "system",
        entityId = null,
        roomId = null,
        actionUrl = null,
        metadata = {},
        dedupKey = null,
        io = null
    }) {
        try {
            if (!recipient) return null;

            // Prevent notifying self
            if (actor && actor.toString() === recipient.toString()) {
                return null;
            }

            // Deduplication check
            if (dedupKey) {
                const existing = await Notification.findOne({ recipient, dedupKey });
                if (existing) {
                    return existing;
                }
            }

            // Check recipient preferences (if disabled for this category, skip)
            const recipientUser = await User.findById(recipient).select("notificationPreferences");
            if (recipientUser && recipientUser.notificationPreferences) {
                const prefs = recipientUser.notificationPreferences;
                if (prefs.inAppNotifications === false) return null;
                if (type.startsWith("assignment_") && prefs.assignmentNotifications === false) return null;
                if (type.startsWith("quiz_") && prefs.quizNotifications === false) return null;
                if (type.startsWith("attendance_") && prefs.attendanceNotifications === false) return null;
                if (type.startsWith("calendar_") && prefs.calendarNotifications === false) return null;
                if (type.startsWith("live_class_") && prefs.liveClassNotifications === false) return null;
                if ((type.startsWith("academic_") || type.startsWith("performance_")) && prefs.analyticsNotifications === false) return null;
            }

            const notification = await Notification.create({
                recipient,
                actor,
                type,
                title: title.trim(),
                message: message.trim(),
                priority,
                entityType,
                entityId,
                roomId,
                actionUrl,
                metadata,
                dedupKey,
                isRead: false
            });

            // Populate actor and room details for real-time client display
            const populated = await Notification.findById(notification._id)
                .populate("actor", "fullname email role")
                .populate("roomId", "name code section");

            // Real-time dispatch via Socket.IO directly to recipient's personal channels
            if (io) {
                const recipientIdStr = recipient.toString();
                io.to(recipientIdStr).emit("notification:new", populated);
                io.to(`user_${recipientIdStr}`).emit("notification:new", populated);
                
                const unreadCount = await this.getUnreadCount(recipient);
                io.to(recipientIdStr).emit("notification:unread_count", { unreadCount });
                io.to(`user_${recipientIdStr}`).emit("notification:unread_count", { unreadCount });
            }

            return populated;
        } catch (err) {
            console.error("Notification creation error:", err);
            return null;
        }
    }

    /**
     * Create multiple notifications for a list of recipients (e.g. classroom-wide broadcast)
     */
    async createManyNotifications(notificationsList, io = null) {
        if (!Array.isArray(notificationsList) || notificationsList.length === 0) {
            return [];
        }

        const results = [];
        for (const item of notificationsList) {
            try {
                const created = await this.createNotification({ ...item, io });
                if (created) results.push(created);
            } catch (e) {
                console.error("Batch notification single item error:", e);
            }
        }
        return results;
    }

    /**
     * Mark a single notification as read (strictly authorized to recipient)
     */
    async markAsRead(notificationId, userId, io = null) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid Notification ID");
        }

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return null;
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        if (io) {
            const uId = userId.toString();
            const unreadCount = await this.getUnreadCount(userId);
            io.to(uId).emit("notification:unread_count", { unreadCount });
            io.to(`user_${uId}`).emit("notification:unread_count", { unreadCount });
        }

        return notification;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId, roomId = null, io = null) {
        const query = { recipient: userId, isRead: false };
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            query.roomId = roomId;
        }

        const res = await Notification.updateMany(query, {
            $set: { isRead: true, readAt: new Date() }
        });

        if (io) {
            const uId = userId.toString();
            const unreadCount = await this.getUnreadCount(userId);
            io.to(uId).emit("notification:unread_count", { unreadCount });
            io.to(`user_${uId}`).emit("notification:unread_count", { unreadCount });
        }

        return res.modifiedCount;
    }

    /**
     * Delete a single notification (strictly authorized to recipient)
     */
    async deleteNotification(notificationId, userId, io = null) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid Notification ID");
        }

        const res = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });

        if (res && io) {
            const uId = userId.toString();
            const unreadCount = await this.getUnreadCount(userId);
            io.to(uId).emit("notification:unread_count", { unreadCount });
            io.to(`user_${uId}`).emit("notification:unread_count", { unreadCount });
        }

        return !!res;
    }

    /**
     * Clear all read notifications for a user
     */
    async clearReadNotifications(userId) {
        const res = await Notification.deleteMany({
            recipient: userId,
            isRead: true
        });

        return res.deletedCount;
    }

    /**
     * Clear all notifications for a user
     */
    async clearAllNotifications(userId) {
        const res = await Notification.deleteMany({
            recipient: userId
        });

        return res.deletedCount;
    }

    /**
     * Retrieve paginated notifications with optional filters
     */
    async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false, type = null, priority = null, roomId = null }) {
        const query = { recipient: userId };

        if (unreadOnly === true || unreadOnly === 'true') {
            query.isRead = false;
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        if (priority && priority !== 'all') {
            query.priority = priority;
        }

        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            query.roomId = roomId;
        }

        const parsedPage = Math.max(1, Number(page) || 1);
        const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (parsedPage - 1) * parsedLimit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .populate("actor", "fullname email role")
                .populate("roomId", "name code section")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit),
            Notification.countDocuments(query),
            Notification.countDocuments({ recipient: userId, isRead: false })
        ]);

        return {
            notifications,
            total,
            unreadCount,
            page: parsedPage,
            totalPages: Math.ceil(total / parsedLimit) || 1
        };
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId) {
        return await Notification.countDocuments({ recipient: userId, isRead: false });
    }

    /**
     * Get user notification preferences
     */
    async getPreferences(userId) {
        const user = await User.findById(userId).select("notificationPreferences");
        return user?.notificationPreferences || {
            assignmentNotifications: true,
            quizNotifications: true,
            attendanceNotifications: true,
            calendarNotifications: true,
            liveClassNotifications: true,
            analyticsNotifications: true,
            inAppNotifications: true
        };
    }

    /**
     * Update user notification preferences
     */
    async updatePreferences(userId, prefs) {
        const user = await User.findById(userId);
        if (!user) return null;
        user.notificationPreferences = {
            ...(user.notificationPreferences || {}),
            ...prefs
        };
        await user.save();
        return user.notificationPreferences;
    }
}

module.exports = new NotificationService();
