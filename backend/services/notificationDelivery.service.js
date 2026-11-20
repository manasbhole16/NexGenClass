const Notification = require("../models/notification-model");
const User = require("../models/user-model");
const emailService = require("./email.service");
const smsService = require("./sms.service");
const { isEmailConfigured } = require("../config/mailer");
const { ESSENTIAL_TYPES } = require("./notificationPolicy");
const logger = require("../utils/logger");

/**
 * MongoDB-backed outbox for email/SMS.
 *
 * Status lifecycle per channel:
 *   queued -> sending -> sent      (SMTP / gateway accepted the message; NOT proof of inbox delivery)
 *                     -> queued    (temporary failure, retry with backoff)
 *                     -> failed    (permanent failure or retries exhausted)
 *   skipped                        (provider not configured, no address, or user opted out since queuing)
 *   delivered                      (only set from a provider confirmation webhook; email never reaches it via SMTP alone)
 *
 * Claims are atomic (findOneAndUpdate) so concurrent workers / restarts cannot double-send.
 */
const MAX_ATTEMPTS = Number(process.env.NOTIFY_MAX_ATTEMPTS || 4);
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000]; // after attempt 1,2,3
const STALE_SENDING_MS = 5 * 60_000;

const backoffFor = (attempts) => BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];

const formatInZone = (date, timeZone) => {
    try {
        return new Date(date).toLocaleString("en-IN", { timeZone: timeZone || "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    } catch {
        return new Date(date).toISOString();
    }
};

const buildDetails = (n, tz) => {
    const m = n.metadata || {};
    const parts = [];
    if (m.dueDate) parts.push(`Due: ${formatInZone(m.dueDate, tz)}`);
    if (m.deadline) parts.push(`Deadline: ${formatInZone(m.deadline, tz)}`);
    if (m.startsAt) parts.push(`Starts: ${formatInZone(m.startsAt, tz)}`);
    return parts.join(" • ");
};

/** Atomically claim one channel of one notification. Returns the claimed doc or null. */
const claim = (id, channel, now) => {
    const key = `deliveryStatus.${channel}`;
    return Notification.findOneAndUpdate(
        {
            _id: id,
            $or: [
                { [`${key}.status`]: "queued", [`${key}.nextAttemptAt`]: { $lte: now } },
                { [`${key}.status`]: "sending", [`${key}.lastAttemptAt`]: { $lt: new Date(now.getTime() - STALE_SENDING_MS) } } // crashed worker
            ]
        },
        { $set: { [`${key}.status`]: "sending", [`${key}.lastAttemptAt`]: now }, $inc: { [`${key}.attempts`]: 1 } },
        { new: true }
    ).populate("roomId", "name");
};

const finish = (id, channel, patch) => {
    const set = {};
    for (const [k, v] of Object.entries(patch)) set[`deliveryStatus.${channel}.${k}`] = v;
    return Notification.updateOne({ _id: id }, { $set: set });
};

const settle = async (n, channel, err, isTemporary) => {
    const attempts = n.deliveryStatus[channel].attempts;
    const msg = String(err.message || err).slice(0, 300);
    if (err.code === "ENOTCONFIGURED") {
        await finish(n._id, channel, { status: "skipped", error: msg, nextAttemptAt: null });
        logger.warn(`${channel}.skipped`, { id: String(n._id), reason: msg });
    } else if (isTemporary(err) && attempts < MAX_ATTEMPTS) {
        await finish(n._id, channel, { status: "queued", error: msg, nextAttemptAt: new Date(Date.now() + backoffFor(attempts)) });
        logger.warn(`${channel}.retry_scheduled`, { id: String(n._id), attempts, error: msg });
    } else {
        await finish(n._id, channel, { status: "failed", error: msg, nextAttemptAt: null });
        logger.error(`${channel}.failed`, { id: String(n._id), attempts, error: msg });
    }
};

const optedOut = (user, channel, type) => {
    if (ESSENTIAL_TYPES.has(type)) return false;
    const p = user.notificationPreferences || {};
    return channel === "email" ? p.emailNotifications === false : p.smsNotifications !== true;
};

const deliverEmail = async (n, user) => {
    const { messageId } = await emailService.sendNotificationEmail({
        to: user.email,
        category: n.category,
        subject: `[NexGenClass] ${n.title}`,
        recipientName: user.fullname,
        title: n.title,
        message: n.message,
        className: n.roomId && n.roomId.name,
        details: buildDetails(n, user.timezone),
        actionUrl: n.actionUrl
    });
    await finish(n._id, "email", { status: "sent", sentAt: new Date(), messageId: messageId || null, error: null, nextAttemptAt: null });
    logger.info("email.status_sent", { id: String(n._id), messageId });
};

const deliverSms = async (n, user) => {
    const { messageId } = await smsService.sendSms({ to: user.phone, message: `NexGenClass: ${n.title} - ${n.message}` });
    await finish(n._id, "sms", { status: "sent", sentAt: new Date(), messageId: messageId || null, error: null, nextAttemptAt: null });
};

/** Process whichever channels of one notification are due. Safe to call repeatedly. */
const processNotification = async (id) => {
    const now = new Date();
    for (const channel of ["email", "sms"]) {
        const n = await claim(id, channel, now);
        if (!n) continue;
        try {
            const user = await User.findById(n.recipient).select("email fullname phone timezone notificationPreferences");
            if (!user || (channel === "email" ? !user.email : !user.phone) || optedOut(user, channel, n.type)) {
                await finish(n._id, channel, { status: "skipped", error: "recipient unavailable or opted out", nextAttemptAt: null });
                continue;
            }
            if (channel === "email" && !isEmailConfigured()) {
                const e = new Error("SMTP is not configured"); e.code = "ENOTCONFIGURED"; throw e;
            }
            if (channel === "email") await deliverEmail(n, user);
            else await deliverSms(n, user);
        } catch (err) {
            await settle(n, channel, err, channel === "email" ? emailService.isTemporaryError : smsService.isTemporaryError);
        }
    }
};

/** Worker entry point: pick up due and stale items. Returns the number of notifications processed. */
const processDueDeliveries = async (limit = 50) => {
    const now = new Date();
    const stale = new Date(now.getTime() - STALE_SENDING_MS);
    const due = (ch) => ([
        { [`deliveryStatus.${ch}.status`]: "queued", [`deliveryStatus.${ch}.nextAttemptAt`]: { $lte: now } },
        { [`deliveryStatus.${ch}.status`]: "sending", [`deliveryStatus.${ch}.lastAttemptAt`]: { $lt: stale } }
    ]);
    const items = await Notification.find({ $or: [...due("email"), ...due("sms")] }).select("_id").sort({ createdAt: 1 }).limit(limit).lean();
    for (const it of items) {
        try { await processNotification(it._id); } catch (e) { logger.error("delivery.process_failed", { id: String(it._id), error: e.message }); }
    }
    return items.length;
};

/** Called by provider webhooks that confirm delivery (SMS gateways). Email SMTP has no such confirmation. */
const markDelivered = (channel, messageId) =>
    Notification.updateOne(
        { [`deliveryStatus.${channel}.messageId`]: messageId },
        { $set: { [`deliveryStatus.${channel}.status`]: "delivered", [`deliveryStatus.${channel}.deliveredAt`]: new Date() } }
    );

module.exports = { processNotification, processDueDeliveries, markDelivered, backoffFor, MAX_ATTEMPTS };
