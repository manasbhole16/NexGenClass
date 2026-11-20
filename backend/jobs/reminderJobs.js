const cron = require("node-cron");
const Task = require("../models/task-model");
const Room = require("../models/room-model");
const Quiz = require("../models/quiz-model");
const Attempt = require("../models/attempt-model");
const Submission = require("../models/submission-model");
const LiveSession = require("../models/liveSession-model");
const notificationService = require("../services/notificationService");
const delivery = require("../services/notificationDelivery.service");
const logger = require("../utils/logger");

/**
 * Database-driven reminders. Every run is idempotent: each notification carries a dedupKey that
 * includes the event's date/time, so server restarts, overlapping runs and multiple instances never
 * produce duplicates, and a rescheduled event gets exactly one fresh reminder.
 */
const HOUR = 3600 * 1000;
const DUE_WINDOW_H = Number(process.env.REMINDER_WINDOW_HOURS || 24);
const QUIZ_START_WINDOW_MIN = Number(process.env.QUIZ_START_REMINDER_MINUTES || 60);
const LIVE_WINDOW_MIN = Number(process.env.LIVE_CLASS_REMINDER_MINUTES || 30);
const CRON_EXPR = process.env.REMINDER_CRON || "*/10 * * * *";
const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

const idStr = (x) => String(x._id || x);
const hoursLabel = (ms) => { const h = Math.max(1, Math.round(ms / HOUR)); return h === 1 ? "1 hour" : `${h} hours`; };
const minsLabel = (ms) => `${Math.max(1, Math.round(ms / 60000))} minutes`;

const classMembers = (room, excludeOwner = true) =>
    (room.members || []).filter((m) => !(excludeOwner && room.owner && idStr(m) === idStr(room.owner))).map(idStr);

async function roomsById(ids) {
    const rooms = await Room.find({ _id: { $in: [...new Set(ids.map(idStr))] } }).select("name owner members");
    return new Map(rooms.map((r) => [idStr(r), r]));
}

async function assignmentReminders(io, now) {
    const end = new Date(now.getTime() + DUE_WINDOW_H * HOUR);
    const tasks = await Task.find({ dueDate: { $gt: now, $lte: end }, status: { $ne: "Done" }, isDraft: { $ne: true } })
        .select("title dueDate room owner assignedTo");
    if (!tasks.length) return 0;
    const rooms = await roomsById(tasks.filter((t) => t.room).map((t) => t.room));
    const subs = await Submission.find({ taskId: { $in: tasks.map((t) => t._id) }, status: { $in: ["submitted", "graded"] } }).select("taskId studentId");
    const done = new Set(subs.map((s) => `${idStr(s.taskId)}:${idStr(s.studentId)}`));

    const items = [];
    for (const t of tasks) {
        const due = t.dueDate.getTime();
        let recipients = [];
        if (t.room) {
            const room = rooms.get(idStr(t.room));
            if (!room) continue;
            recipients = t.assignedTo && t.assignedTo.length ? t.assignedTo.map(idStr) : classMembers(room);
        } else if (t.owner) recipients = [idStr(t.owner)];
        for (const r of recipients) {
            if (done.has(`${idStr(t)}:${r}`)) continue;
            const personal = !t.room;
            items.push({
                recipient: r,
                type: personal ? "task_due_soon" : "assignment_due_soon",
                title: personal ? "Task Due Soon" : "Assignment Due Soon",
                message: `"${t.title}" is due in ${hoursLabel(due - now.getTime())}.`,
                priority: due - now.getTime() < 3 * HOUR ? "high" : "normal",
                entityType: "task", entityId: t._id, roomId: t.room || null,
                actionUrl: t.room ? `/room/${idStr(t.room)}?tab=classwork` : "/calendar",
                metadata: { taskId: t._id, dueDate: t.dueDate },
                dedupKey: `due_soon:${idStr(t)}:${due}`
            });
        }
    }
    return (await notificationService.createManyNotifications(items, io)).length;
}

async function overdueReminders(io, now) {
    const since = new Date(now.getTime() - 48 * HOUR);
    const tasks = await Task.find({ dueDate: { $gte: since, $lt: now }, isDraft: { $ne: true }, room: { $ne: null } }).select("title dueDate room assignedTo");
    if (!tasks.length) return 0;
    const rooms = await roomsById(tasks.map((t) => t.room));
    const subs = await Submission.find({ taskId: { $in: tasks.map((t) => t._id) }, status: { $in: ["submitted", "graded"] } }).select("taskId studentId");
    const done = new Set(subs.map((s) => `${idStr(s.taskId)}:${idStr(s.studentId)}`));
    const items = [];
    for (const t of tasks) {
        const room = rooms.get(idStr(t.room));
        if (!room) continue;
        const recipients = t.assignedTo && t.assignedTo.length ? t.assignedTo.map(idStr) : classMembers(room);
        for (const r of recipients) {
            if (done.has(`${idStr(t)}:${r}`)) continue;
            items.push({
                recipient: r, type: "assignment_overdue", title: "Assignment Overdue", priority: "high",
                message: `"${t.title}" was due on ${t.dueDate.toLocaleDateString("en-IN", { timeZone: TZ })}. Please submit as soon as possible.`,
                entityType: "task", entityId: t._id, roomId: t.room, actionUrl: `/room/${idStr(t.room)}?tab=classwork`,
                metadata: { taskId: t._id, dueDate: t.dueDate }, dedupKey: `overdue:${idStr(t)}:${t.dueDate.getTime()}`
            });
        }
    }
    return (await notificationService.createManyNotifications(items, io)).length;
}

async function quizReminders(io, now) {
    const startEnd = new Date(now.getTime() + QUIZ_START_WINDOW_MIN * 60000);
    const dueEnd = new Date(now.getTime() + DUE_WINDOW_H * HOUR);
    const quizzes = await Quiz.find({
        isPublished: true, status: { $in: ["published", "scheduled"] },
        $or: [{ startDate: { $gt: now, $lte: startEnd } }, { deadline: { $gt: now, $lte: dueEnd } }]
    }).select("title startDate deadline roomId");
    if (!quizzes.length) return 0;
    const rooms = await roomsById(quizzes.map((q) => q.roomId));
    const attempts = await Attempt.find({ quizId: { $in: quizzes.map((q) => q._id) }, status: { $in: ["submitted", "graded"] } }).select("quizId studentId");
    const done = new Set(attempts.map((a) => `${idStr(a.quizId)}:${idStr(a.studentId)}`));
    const items = [];
    for (const q of quizzes) {
        const room = rooms.get(idStr(q.roomId));
        if (!room) continue;
        const starting = q.startDate && q.startDate > now && q.startDate <= startEnd;
        const t = starting ? q.startDate : q.deadline;
        for (const r of classMembers(room)) {
            if (done.has(`${idStr(q)}:${r}`)) continue;
            items.push({
                recipient: r,
                type: starting ? "quiz_starting_soon" : "quiz_due_soon",
                title: starting ? "Quiz Starting Soon" : "Quiz Closing Soon",
                message: starting
                    ? `"${q.title}" opens in ${minsLabel(t - now)}.`
                    : `"${q.title}" closes in ${hoursLabel(t - now)}. Attempt it before the deadline.`,
                priority: "high", entityType: "quiz", entityId: q._id, roomId: q.roomId,
                actionUrl: `/room/${idStr(q.roomId)}?tab=quizzes`,
                metadata: starting ? { quizId: q._id, startsAt: q.startDate } : { quizId: q._id, deadline: q.deadline },
                dedupKey: `${starting ? "quiz_start" : "quiz_due"}:${idStr(q)}:${t.getTime()}`
            });
        }
    }
    return (await notificationService.createManyNotifications(items, io)).length;
}

async function liveClassReminders(io, now) {
    const end = new Date(now.getTime() + LIVE_WINDOW_MIN * 60000);
    const sessions = await LiveSession.find({ status: "scheduled", scheduledAt: { $gt: now, $lte: end } }).select("title scheduledAt roomId");
    if (!sessions.length) return 0;
    const rooms = await roomsById(sessions.map((s) => s.roomId));
    const items = [];
    for (const s of sessions) {
        const room = rooms.get(idStr(s.roomId));
        if (!room) continue;
        for (const r of [...classMembers(room), idStr(room.owner)]) {
            items.push({
                recipient: r, type: "live_class_starting", title: "Live Class Starting Soon", priority: "high",
                message: `"${s.title}" starts in ${minsLabel(s.scheduledAt - now)}.`,
                entityType: "live_session", entityId: s._id, roomId: s.roomId, actionUrl: `/room/${idStr(s.roomId)}`,
                metadata: { startsAt: s.scheduledAt }, dedupKey: `live_start:${idStr(s)}:${s.scheduledAt.getTime()}`
            });
        }
    }
    return (await notificationService.createManyNotifications(items, io)).length;
}

async function runAllReminders(io = null) {
    const now = new Date();
    const out = {};
    for (const [name, fn] of Object.entries({ assignmentReminders, overdueReminders, quizReminders, liveClassReminders })) {
        try { out[name] = await fn(io, now); } catch (e) { out[name] = "error"; logger.error("reminders.failed", { job: name, error: e.message }); }
    }
    logger.info("reminders.run", out);
    return out;
}

/** Starts schedulers (local/long-running hosts). On Vercel use the /internal/run-scheduled endpoint instead. */
function startReminderJobs(io) {
    if (process.env.VERCEL || process.env.NODE_ENV === "test" || process.env.DISABLE_SCHEDULERS === "true") return [];
    const jobs = [
        cron.schedule(CRON_EXPR, () => runAllReminders(io).catch((e) => logger.error("reminders.crash", { error: e.message })), { timezone: TZ }),
        cron.schedule("* * * * *", () => delivery.processDueDeliveries().catch((e) => logger.error("delivery.crash", { error: e.message })), { timezone: TZ })
    ];
    logger.info("schedulers.started", { reminders: CRON_EXPR, timezone: TZ });
    return jobs;
}

module.exports = { runAllReminders, startReminderJobs, assignmentReminders, quizReminders, liveClassReminders, overdueReminders };
