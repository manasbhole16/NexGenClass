const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher'], default: 'student' },
    notificationPreferences: {
        assignmentNotifications: { type: Boolean, default: true },
        quizNotifications: { type: Boolean, default: true },
        attendanceNotifications: { type: Boolean, default: true },
        calendarNotifications: { type: Boolean, default: true },
        liveClassNotifications: { type: Boolean, default: true },
        analyticsNotifications: { type: Boolean, default: true },
        inAppNotifications: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
