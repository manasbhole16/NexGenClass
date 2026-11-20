const mongoose = require("mongoose");
const Attendance = require("../models/attendance-model");
const notificationService = require("./notificationService");

const isoWeekKey = (d = new Date()) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `${t.getUTCFullYear()}-W${Math.ceil(((t - y0) / 86400000 + 1) / 7)}`;
};

/**
 * After attendance is saved: one aggregation computes each affected student's room attendance %.
 * Students under the threshold get at most ONE alert per ISO week; the teacher gets one summary per session.
 */
async function checkLowAttendance({ roomId, session, studentIds, teacherId, roomName, io }) {
    const threshold = session.thresholdPercentage || 75;
    const ids = studentIds.map((s) => new mongoose.Types.ObjectId(String(s)));
    const rows = await Attendance.aggregate([
        { $match: { roomId: new mongoose.Types.ObjectId(String(roomId)) } },
        { $unwind: "$records" },
        { $match: { "records.student": { $in: ids } } },
        { $group: { _id: "$records.student", total: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ["$records.status", ["Present", "Late"]] }, 1, 0] } } } }
    ]);
    const low = rows.map((r) => ({ id: String(r._id), pct: Math.round((r.attended / r.total) * 100), total: r.total })).filter((r) => r.pct < threshold);
    if (!low.length) return 0;

    const week = isoWeekKey();
    const items = low.map((r) => ({
        recipient: r.id, actor: teacherId, type: "attendance_low_threshold", priority: "high",
        title: "Attendance Below Required Level",
        message: `Your attendance in "${roomName}" is ${r.pct}%, below the required ${threshold}%.`,
        entityType: "attendance", entityId: session._id, roomId,
        actionUrl: `/room/${roomId}?tab=attendance`, metadata: { percentage: r.pct, threshold },
        dedupKey: `att_low:${roomId}:${r.id}:${week}`
    }));
    if (teacherId) {
        items.push({
            recipient: String(teacherId), type: "attendance_warning", priority: "normal",
            title: "Students Below Attendance Threshold",
            message: `${low.length} student(s) in "${roomName}" are below ${threshold}% attendance after "${session.title}".`,
            entityType: "attendance", entityId: session._id, roomId, actionUrl: `/room/${roomId}?tab=attendance`,
            channels: ["inApp"], dedupKey: `att_low_teacher:${session._id}`
        });
    }
    return (await notificationService.createManyNotifications(items, io)).length;
}

module.exports = { checkLowAttendance, isoWeekKey };
