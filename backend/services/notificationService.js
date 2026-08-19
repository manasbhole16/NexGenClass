const Notification = require("../models/notification-model");
const User = require("../models/user-model");
const Room = require("../models/room-model");
const mongoose = require("mongoose");

class NotificationService {
    /**
     * Create and dispatch a single notification with optional deduplication and Socket.IO emission
     */
    async createNotification({
        recipient,
        actor = null,
        type,
        title,
        message,
        entityType = "system",
        entityId = null,
        roomId = null,
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

            const notification = await Notification.create({
                recipient,
                actor,
                type,
                title: title.trim(),
                message: message.trim(),
                entityType,
                entityId,
                roomId,
                metadata,
                dedupKey,
                isRead: false
            });

            // Populate actor and room details for real-time client display
            const populated = await Notification.findById(notification._id)
                .populate("actor", "fullname email role avatar")
                .populate("roomId", "name code section");

            // Real-time dispatch via Socket.IO directly to recipient's personal room
            if (io) {
                const recipientIdStr = recipient.toString();
                io.to(recipientIdStr).emit("notification:new", populated);
                io.to(`user_${recipientIdStr}`).emit("notification:new", populated);
            }

            return populated;
        } catch (err) {
            console.error("Notification creation error:", err);
            return null;
        }
    }

    /**
     * Create multiple notifications for a list of recipients (e.g. classroom broadcast)
     */
    async createManyNotifications(notificationsList, io = null) {
        if (!Array.isArray(notificationsList) || notificationsList.length === 0) {
            return [];
        }

        const results = [];
        for (const item of notificationsList) {
            const created = await this.createNotification({ ...item, io });
            if (created) results.push(created);
        }
        return results;
    }

    /**
     * Mark a single notification as read (strictly authorized to recipient)
     */
    async markAsRead(notificationId, userId) {
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

        return notification;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId, roomId = null) {
        const query = { recipient: userId, isRead: false };
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            query.roomId = roomId;
        }

        const res = await Notification.updateMany(query, {
            $set: { isRead: true, readAt: new Date() }
        });

        return res.modifiedCount;
    }

    /**
     * Delete a single notification (strictly authorized to recipient)
     */
    async deleteNotification(notificationId, userId) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid Notification ID");
        }

        const res = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });

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
     * Retrieve paginated notifications with optional filters
     */
    async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false, type = null, roomId = null }) {
        const query = { recipient: userId };

        if (unreadOnly === true || unreadOnly === 'true') {
            query.isRead = false;
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            query.roomId = roomId;
        }

        const parsedPage = Math.max(1, Number(page) || 1);
        const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (parsedPage - 1) * parsedLimit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .populate("actor", "fullname email role avatar")
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
}

module.exports = new NotificationService();
