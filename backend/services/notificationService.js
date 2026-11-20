const mongoose = require("mongoose");
const Notification = require("../models/notification-model");
const User = require("../models/user-model");
require("../models/room-model"); // registers Room for populate()
const logger = require("../utils/logger");
const { categoryForType, resolveChannels, normalizePriority } = require("./notificationPolicy");
const { normalizePhone, isSmsConfigured } = require("./sms.service");
const { isEmailConfigured } = require("../config/mailer");

const MAX_TITLE = 200;
const MAX_MESSAGE = 2000;
const BATCH_CONCURRENCY = 20;

// In-app records hidden because the user switched in-app off (kept only to track email/SMS delivery).
const VISIBLE = { "deliveryStatus.inApp.status": { $ne: "skipped" } };

const PREFERENCE_KEYS = [
    "inAppNotifications", "emailNotifications", "smsNotifications",
    "assignmentNotifications", "quizNotifications", "attendanceNotifications",
    "announcementNotifications", "calendarNotifications", "liveClassNotifications",
    "analyticsNotifications", "urgentAlerts"
];

const userRoom = (userId) => `user_${userId.toString()}`;

const safeActionUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const u = url.trim();
    if (u.startsWith("/") && !u.startsWith("//")) return u.slice(0, 500);
    if (/^https?:\/\//i.test(u)) return u.slice(0, 500);
    return null;
};

const stripControl = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

class NotificationService {
    /** Emit to every active session of a user (single private room; multi-tab/device safe). */
    emitToUser(io, userId, event, payload) {
        if (!io || !userId) return;
        io.to(userRoom(userId)).emit(event, payload);
    }

    async emitCount(io, userId) {
        if (!io) return;
        const unreadCount = await this.getUnreadCount(userId);
        this.emitToUser(io, userId, "notification:count-updated", { unreadCount });
        this.emitToUser(io, userId, "notification:unread_count", { unreadCount }); // legacy event name
    }

    /**
     * Create and dispatch a notification: persist, push in real time, and queue email/SMS.
     * Never throws; returns the populated notification, the existing one on duplicates, or null.
     * Email/SMS are queued (status "queued") and sent by the delivery worker, never inline.
     */
    async createNotification(opts) {
        try {
            return await this._create(opts, null);
        } catch (err) {
            logger.error("notification.create_failed", { error: err.message });
            return null;
        }
    }

    async _create({
        recipient, actor = null, type, title, message, priority = "normal", category = null,
        channels = null, entityType = "system", entityId = null, roomId = null, actionUrl = null,
        metadata = {}, dedupKey = null, io = null
    }, preloadedUser) {
        if (!recipient || !type) return null;
        if (!mongoose.Types.ObjectId.isValid(recipient)) return null;
        if (typeof title !== "string" || typeof message !== "string") return null;
        const cleanTitle = stripControl(title).slice(0, MAX_TITLE);
        const cleanMessage = stripControl(message).slice(0, MAX_MESSAGE);
        if (!cleanTitle || !cleanMessage) return null;

        if (actor && actor.toString() === recipient.toString()) return null; // never notify yourself

        if (dedupKey) {
            const existing = await Notification.findOne({ recipient, dedupKey });
            if (existing) return existing;
        }

        const user = preloadedUser ||
            await User.findById(recipient).select("email fullname phone timezone notificationPreferences");
        if (!user) return null;

        const prio = normalizePriority(priority);
        const cat = category || categoryForType(type);
        const plan = resolveChannels({ type, category: cat, priority: prio, requestedChannels: channels, user });
        if (!plan.inApp && !plan.email && !plan.sms) return null;

        const now = new Date();
        const queued = () => ({ status: "queued", attempts: 0, nextAttemptAt: now });
        const doc = {
            recipient, actor, type, category: cat, title: cleanTitle, message: cleanMessage, priority: prio,
            entityType, entityId, roomId, actionUrl: safeActionUrl(actionUrl), metadata, dedupKey, isRead: false,
            channels: ["inApp", "email", "sms"].filter((c) => plan[c]),
            deliveryStatus: {
                inApp: plan.inApp ? { status: "delivered", deliveredAt: now } : { status: "skipped" },
                email: plan.email ? queued() : { status: "none" },
                sms: plan.sms ? queued() : { status: "none" }
            }
        };

        let created;
        try {
            created = await Notification.create(doc);
        } catch (err) {
            if (err && err.code === 11000 && dedupKey) {
                return await Notification.findOne({ recipient, dedupKey }); // lost a race: duplicate suppressed
            }
            throw err;
        }

        const populated = await Notification.findById(created._id)
            .populate("actor", "fullname role")
            .populate("roomId", "name code section");

        if (plan.inApp && io) {
            this.emitToUser(io, recipient, "notification:new", populated);
            await this.emitCount(io, recipient);
        }

        if ((plan.email || plan.sms) && process.env.NOTIFY_AUTOKICK !== "false") {
            // Fire-and-forget: API responses must never wait on SMTP / SMS gateways.
            // Lazy require avoids a circular dependency with the delivery service.
            const delivery = require("./notificationDelivery.service");
            setImmediate(() => delivery.processNotification(created._id).catch((e) =>
                logger.error("delivery.kick_failed", { id: String(created._id), error: e.message })));
        }

        return plan.inApp ? populated : null;
    }

    /** Batch creation: one user lookup for all recipients (no N+1), bounded concurrency. */
    async createManyNotifications(list, io = null) {
        if (!Array.isArray(list) || list.length === 0) return [];
        const ids = [...new Set(list.map((n) => n && n.recipient && String(n.recipient)).filter((id) => id && mongoose.Types.ObjectId.isValid(id)))];
        const users = await User.find({ _id: { $in: ids } }).select("email fullname phone timezone notificationPreferences");
        const byId = new Map(users.map((u) => [String(u._id), u]));

        const results = [];
        for (let i = 0; i < list.length; i += BATCH_CONCURRENCY) {
            const chunk = list.slice(i, i + BATCH_CONCURRENCY);
            const settled = await Promise.allSettled(chunk.map((item) => {
                const u = item && byId.get(String(item.recipient));
                return u ? this._create({ ...item, io }, u) : null;
            }));
            for (const r of settled) {
                if (r.status === "fulfilled" && r.value) results.push(r.value);
                else if (r.status === "rejected") logger.error("notification.batch_item_failed", { error: r.reason && r.reason.message });
            }
        }
        return results;
    }

    async markAsRead(notificationId, userId, io = null) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new Error("Invalid Notification ID");
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { $set: { isRead: true, readAt: new Date() } },
            { new: true }
        );
        if (!notification) return null;
        this.emitToUser(io, userId, "notification:read", { id: String(notification._id) });
        await this.emitCount(io, userId);
        return notification;
    }

    async markAllAsRead(userId, roomId = null, io = null) {
        const query = { recipient: userId, isRead: false };
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) query.roomId = roomId;
        const res = await Notification.updateMany(query, { $set: { isRead: true, readAt: new Date() } });
        this.emitToUser(io, userId, "notification:read-all", { roomId: query.roomId ? String(query.roomId) : null });
        await this.emitCount(io, userId);
        return res.modifiedCount;
    }

    async deleteNotification(notificationId, userId, io = null) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new Error("Invalid Notification ID");
        const res = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
        if (res) {
            this.emitToUser(io, userId, "notification:deleted", { id: String(res._id) });
            await this.emitCount(io, userId);
        }
        return !!res;
    }

    async clearReadNotifications(userId, io = null) {
        const res = await Notification.deleteMany({ recipient: userId, isRead: true });
        this.emitToUser(io, userId, "notification:deleted", { scope: "read" });
        await this.emitCount(io, userId);
        return res.deletedCount;
    }

    async clearAllNotifications(userId, io = null) {
        const res = await Notification.deleteMany({ recipient: userId });
        this.emitToUser(io, userId, "notification:deleted", { scope: "all" });
        await this.emitCount(io, userId);
        return res.deletedCount;
    }

    async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false, readOnly = false, type = null, category = null, priority = null, roomId = null } = {}) {
        const query = { recipient: userId, ...VISIBLE };
        if (unreadOnly === true || unreadOnly === "true") query.isRead = false;
        else if (readOnly === true || readOnly === "true") query.isRead = true;
        if (type && type !== "all" && typeof type === "string") query.type = type;
        if (category && category !== "all" && typeof category === "string") query.category = category;
        if (priority && priority !== "all" && typeof priority === "string") query.priority = normalizePriority(priority);
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) query.roomId = roomId;

        const parsedPage = Math.max(1, Number(page) || 1);
        const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (parsedPage - 1) * parsedLimit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .select("-deliveryStatus.email.messageId -deliveryStatus.sms.messageId")
                .populate("actor", "fullname role")
                .populate("roomId", "name code section")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Notification.countDocuments(query),
            this.getUnreadCount(userId)
        ]);

        return { notifications, total, unreadCount, page: parsedPage, totalPages: Math.ceil(total / parsedLimit) || 1, hasMore: skip + notifications.length < total };
    }

    async getUnreadCount(userId) {
        return Notification.countDocuments({ recipient: userId, isRead: false, ...VISIBLE });
    }

    async getPreferences(userId) {
        const user = await User.findById(userId).select("notificationPreferences phone timezone");
        if (!user) return null;
        const stored = (user.notificationPreferences && user.notificationPreferences.toObject
            ? user.notificationPreferences.toObject() : user.notificationPreferences) || {};
        const preferences = {};
        for (const k of PREFERENCE_KEYS) preferences[k] = stored[k] === undefined ? k !== "smsNotifications" : stored[k];
        return {
            preferences,
            phone: user.phone || null,
            timezone: user.timezone || "Asia/Kolkata",
            channelAvailability: { email: isEmailConfigured(), sms: isSmsConfigured() }
        };
    }

    /** Whitelisted + type-checked update. Unknown keys are ignored (no mass assignment). */
    async updatePreferences(userId, body = {}) {
        const user = await User.findById(userId);
        if (!user) return null;
        const incoming = body.preferences && typeof body.preferences === "object" ? body.preferences : body;

        const updates = {};
        for (const k of PREFERENCE_KEYS) {
            if (incoming[k] === undefined) continue;
            if (typeof incoming[k] !== "boolean") {
                const e = new Error(`Preference "${k}" must be a boolean`);
                e.status = 400;
                throw e;
            }
            updates[k] = incoming[k];
        }

        if (body.phone !== undefined) {
            if (body.phone === null || body.phone === "") user.phone = null;
            else {
                const phone = normalizePhone(body.phone);
                if (!phone) { const e = new Error("Invalid phone number"); e.status = 400; throw e; }
                user.phone = phone;
            }
        }
        if (body.timezone !== undefined) {
            try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }); } catch {
                const e = new Error("Invalid timezone"); e.status = 400; throw e;
            }
            user.timezone = body.timezone;
        }
        if (updates.smsNotifications === true && !user.phone) {
            const e = new Error("Add a phone number before enabling SMS notifications");
            e.status = 400;
            throw e;
        }

        const current = (user.notificationPreferences && user.notificationPreferences.toObject
            ? user.notificationPreferences.toObject() : user.notificationPreferences) || {};
        user.notificationPreferences = { ...current, ...updates };
        await user.save();
        return this.getPreferences(userId);
    }
}

module.exports = new NotificationService();
module.exports.NotificationService = NotificationService;
module.exports.VISIBLE = VISIBLE;
