const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Late'], required: true, default: 'Present' },
    remarks: { type: String, default: '' },
    markedAt: { type: Date, default: Date.now }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    title: { type: String, default: 'Regular Class Session' },
    sessionType: { 
        type: String, 
        enum: ['lecture', 'lab', 'tutorial', 'seminar', 'exam', 'general'], 
        default: 'lecture' 
    },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    startTime: { type: String, default: '' }, // e.g. "09:00"
    endTime: { type: String, default: '' },   // e.g. "10:00"
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isLocked: { type: Boolean, default: false },
    thresholdPercentage: { type: Number, default: 75 },
    records: [attendanceRecordSchema]
}, { timestamps: true });

// Compound index for querying room attendance by date and time
attendanceSchema.index({ roomId: 1, date: 1, createdAt: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
