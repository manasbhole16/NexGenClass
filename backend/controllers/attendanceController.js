const Attendance = require("../models/attendance-model");
const Room = require("../models/room-model");
const User = require("../models/user-model");

// Mark or update attendance for a specific date
exports.markAttendance = async (req, res) => {
    try {
        const { roomId, date, records } = req.body;
        
        // Verify ownership
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the teacher can mark attendance" });
        }

        // Find existing or create new
        let attendance = await Attendance.findOne({ roomId, date });
        
        if (attendance) {
            attendance.records = records;
            await attendance.save();
        } else {
            attendance = await Attendance.create({ roomId, date, records });
        }

        res.status(200).json({ success: true, message: "Attendance saved successfully", attendance });
    } catch (error) {
        console.error("markAttendance error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get attendance for a specific room and date
exports.getAttendanceByDate = async (req, res) => {
    try {
        const { roomId, date } = req.params;

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        
        // Students can also view the attendance sheet? Only their own? 
        // For simplicity, let's say only owner can view the whole sheet.
        if (room.owner.toString() !== req.user._id.toString()) {
             return res.status(403).json({ success: false, message: "Only the teacher can view this" });
        }

        const attendance = await Attendance.findOne({ roomId, date }).populate('records.student', 'fullname email');
        
        res.status(200).json({ success: true, attendance });
    } catch (error) {
        console.error("getAttendanceByDate error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get attendance report for a room (Teacher)
exports.getRoomAttendanceReport = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId).populate('members', 'fullname email');
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        
        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the teacher can view reports" });
        }

        const attendances = await Attendance.find({ roomId });
        
        // Calculate statistics
        const totalClasses = attendances.length;
        const studentStats = {};

        room.members.forEach(member => {
            studentStats[member._id.toString()] = {
                student: member,
                present: 0,
                absent: 0,
                late: 0,
                total: totalClasses
            };
        });

        attendances.forEach(att => {
            att.records.forEach(record => {
                const sid = record.student.toString();
                if (studentStats[sid]) {
                    if (record.status === 'Present') studentStats[sid].present++;
                    else if (record.status === 'Absent') studentStats[sid].absent++;
                    else if (record.status === 'Late') studentStats[sid].late++;
                }
            });
        });

        // Convert to array and calculate percentage
        const report = Object.values(studentStats).map(stat => {
            const percentage = totalClasses > 0 ? Math.round(((stat.present + stat.late) / totalClasses) * 100) : 0;
            return { ...stat, percentage };
        });

        res.status(200).json({ success: true, totalClasses, report });
    } catch (error) {
        console.error("getRoomAttendanceReport error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get attendance for the logged in student
exports.getStudentAttendance = async (req, res) => {
    try {
        const studentId = req.user._id;
        
        // Find all rooms the student is a member of
        const rooms = await Room.find({ members: studentId });
        const roomIds = rooms.map(r => r._id);

        const attendances = await Attendance.find({ roomId: { $in: roomIds } }).populate('roomId', 'name code');

        // Calculate stats per room
        const subjectStats = {};
        
        rooms.forEach(room => {
            subjectStats[room._id.toString()] = {
                room: { _id: room._id, name: room.name, code: room.code },
                totalClasses: 0,
                present: 0,
                absent: 0,
                late: 0
            };
        });

        const history = [];

        attendances.forEach(att => {
            const rid = att.roomId._id.toString();
            if (subjectStats[rid]) {
                subjectStats[rid].totalClasses++;
                
                const myRecord = att.records.find(r => r.student.toString() === studentId.toString());
                if (myRecord) {
                    if (myRecord.status === 'Present') subjectStats[rid].present++;
                    else if (myRecord.status === 'Absent') subjectStats[rid].absent++;
                    else if (myRecord.status === 'Late') subjectStats[rid].late++;

                    history.push({
                        roomName: att.roomId.name,
                        date: att.date,
                        status: myRecord.status,
                        remarks: myRecord.remarks
                    });
                } else {
                    // Default to absent if no record found for student in an attendance sheet
                    subjectStats[rid].absent++;
                    history.push({
                        roomName: att.roomId.name,
                        date: att.date,
                        status: 'Absent',
                        remarks: 'No record'
                    });
                }
            }
        });

        let overallTotal = 0;
        let overallPresent = 0;

        const subjects = Object.values(subjectStats).map(stat => {
            const percentage = stat.totalClasses > 0 ? Math.round(((stat.present + stat.late) / stat.totalClasses) * 100) : 0;
            overallTotal += stat.totalClasses;
            overallPresent += (stat.present + stat.late);
            return { ...stat, percentage };
        });

        const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;
        
        // Sort history by date descending
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({ 
            success: true, 
            overallPercentage,
            overallTotal,
            overallPresent,
            subjects,
            history: history.slice(0, 50) // Return last 50 records
        });
    } catch (error) {
        console.error("getStudentAttendance error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
