const cron = require("node-cron");
const Task = require("../models/task-model");
const Room = require("../models/room-model");
const Submission = require("../models/submission-model");
const notificationService = require("../services/notificationService");
const { sendMail } = require("../utils/mailer");

const REMINDER_WINDOW_HOURS = Number(process.env.REMINDER_WINDOW_HOURS || 24);
const REMINDER_CRON = process.env.REMINDER_CRON || "0 * * * *";
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || "UTC";

const formatDate = (date) => {
    try {
        return new Date(date).toLocaleString("en-US", { timeZone: DEFAULT_TIMEZONE });
    } catch (err) {
        return new Date(date).toISOString();
    }
};

const startTaskReminderJob = () => {
    const job = cron.schedule(
        REMINDER_CRON,
        async () => {
            const now = new Date();
            const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

            // 1. Due soon tasks (within window)
            const dueSoonTasks = await Task.find({
                dueDate: { $gte: now, $lte: windowEnd },
                status: { $ne: "Done" },
                isDraft: { $ne: true }
            }).populate("owner", "email fullname");

            for (const task of dueSoonTasks) {
                const hoursLeft = Math.max(1, Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / 3600000));
                
                // Identify target recipients
                let recipients = [];
                if (task.room) {
                    const room = await Room.findById(task.room);
                    if (room) {
                        if (Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
                            recipients = task.assignedTo;
                        } else {
                            recipients = (room.members || []).filter(m => m.toString() !== room.owner?.toString());
                        }
                    }
                } else if (task.owner) {
                    recipients = [task.owner._id || task.owner];
                }

                // Check submission status to avoid notifying completed students
                for (const recipientId of recipients) {
                    const sub = await Submission.findOne({ taskId: task._id, studentId: recipientId });
                    if (sub && (sub.status === 'submitted' || sub.status === 'graded')) {
                        continue;
                    }

                    await notificationService.createNotification({
                        recipient: recipientId,
                        actor: null,
                        type: "assignment_due_soon",
                        title: "Assignment Due Soon",
                        message: `"${task.title}" is due in ${hoursLeft} hours.`,
                        entityType: "task",
                        entityId: task._id,
                        roomId: task.room,
                        metadata: { taskId: task._id, dueDate: task.dueDate },
                        dedupKey: `${recipientId}_due_soon_${task._id}`
                    });
                }

                // Optional email for personal task
                if (!task.room && task.owner?.email) {
                    try {
                        await sendMail({
                            to: task.owner.email,
                            subject: `Reminder: ${task.title} due in ${hoursLeft}h`,
                            text: `Hi ${task.owner.fullname || 'there'},\n\nYour task "${task.title}" is due at ${formatDate(task.dueDate)}.`
                        });
                    } catch (e) {}
                }
            }

            // 2. Overdue tasks (passed deadline in last 48h, incomplete)
            const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            const overdueTasks = await Task.find({
                dueDate: { $gte: twoDaysAgo, $lt: now },
                isDraft: { $ne: true }
            });

            for (const task of overdueTasks) {
                let recipients = [];
                if (task.room) {
                    const room = await Room.findById(task.room);
                    if (room) {
                        if (Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
                            recipients = task.assignedTo;
                        } else {
                            recipients = (room.members || []).filter(m => m.toString() !== room.owner?.toString());
                        }
                    }
                }

                for (const recipientId of recipients) {
                    const sub = await Submission.findOne({ taskId: task._id, studentId: recipientId });
                    if (!sub || sub.status === 'unsubmitted' || sub.status === 'in_progress') {
                        await notificationService.createNotification({
                            recipient: recipientId,
                            actor: null,
                            type: "assignment_overdue",
                            title: "Assignment Overdue",
                            message: `"${task.title}" was due on ${formatDate(task.dueDate)}. Please submit as soon as possible.`,
                            entityType: "task",
                            entityId: task._id,
                            roomId: task.room,
                            metadata: { taskId: task._id, dueDate: task.dueDate },
                            dedupKey: `${recipientId}_overdue_${task._id}`
                        });
                    }
                }
            }
        },
        { timezone: DEFAULT_TIMEZONE }
    );

    console.log(`Task reminder job scheduled: ${REMINDER_CRON} (${DEFAULT_TIMEZONE})`);
    return job;
};

module.exports = { startTaskReminderJob };
