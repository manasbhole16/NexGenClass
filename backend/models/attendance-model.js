const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    records: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['Present', 'Absent', 'Late'], required: true },
        remarks: { type: String, default: '' }
    }]
}, { timestamps: true });

// Ensure one attendance record per room per date
attendanceSchema.index({ roomId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
