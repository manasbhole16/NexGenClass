const cron = require("node-cron");
const Task = require("../models/task-model");
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

            const tasks = await Task.find({
                dueDate: { $gte: now, $lte: windowEnd },
                status: { $ne: "Done" },
                $or: [
                    { deadlineReminderSentAt: { $exists: false } },
                    { deadlineReminderSentAt: null }
                ]
            }).populate("owner", "email fullname");

            for (const task of tasks) {
                const ownerEmail = task.owner?.email;
                if (!ownerEmail) continue;

                const hoursLeft = Math.max(1, Math.ceil((task.dueDate - now) / 3600000));
                const scopeLabel = task.room ? "Class task" : "Personal task";

                const subject = `Reminder: ${task.title} due in ${hoursLeft}h`;
                const text = [
                    `Hi ${task.owner?.fullname || "there"},`,
                    "",
                    "This is a reminder that your task is due soon.",
                    `Title: ${task.title}`,
                    `Type: ${task.taskType || "assignment"}`,
                    `Scope: ${scopeLabel}`,
                    `Due: ${formatDate(task.dueDate)}`
                ].join("\n");

                try {
                    const result = await sendMail({
                        to: ownerEmail,
                        subject,
                        text
                    });
                    if (result && result.skipped) {
                        continue;
                    }
                    await Task.updateOne(
                        { _id: task._id },
                        { deadlineReminderSentAt: new Date() }
                    );
                } catch (err) {
                    console.error("Reminder email failed:", err.message);
                }
            }
        },
        { timezone: DEFAULT_TIMEZONE }
    );

    console.log(`Task reminder job scheduled: ${REMINDER_CRON} (${DEFAULT_TIMEZONE})`);
    return job;
};

module.exports = { startTaskReminderJob };
