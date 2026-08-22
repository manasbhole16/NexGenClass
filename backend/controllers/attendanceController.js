const Attendance = require("../models/attendance-model");
const Room = require("../models/room-model");
const User = require("../models/user-model");
const notificationService = require("../services/notificationService");
const mongoose = require("mongoose");

// Helper: Check if user is teacher and owns/co-teaches room
async function isAuthorizedTeacher(user, roomId) {
    if (!user || user.role !== 'teacher') return false;
    if (!roomId) return false;
    const room = await Room.findById(roomId);
    if (!room) return false;
    const isOwner = room.owner && room.owner.toString() === user._id.toString();
    const isMember = room.members && room.members.some(m => m.toString() === user._id.toString());
    return isOwner || isMember;
}

// 1. Create or Mark Attendance Session (Universal Entry Point)
exports.markAttendance = async (req, res) => {
    try {
        const { 
            roomId, 
            date, 
            sessionDate,
            title = 'Class Session', 
            sessionType = 'lecture', 
            startTime = '', 
            endTime = '', 
            records = [],
            thresholdPercentage = 75,
            sessionId
        } = req.body;
        
        const effectiveDate = date || sessionDate;
        if (!roomId || !effectiveDate) {
            return res.status(400).json({ success: false, message: "roomId and date are required." });
        }

        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Only authorized classroom teachers can mark attendance." });
        }

        const room = await Room.findById(roomId).populate('members', 'fullname email role');
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });

        // Validate records against room student members
        const enrolledStudentIds = new Set(
            room.members
                .filter(m => (m.role || 'student').toLowerCase() === 'student' && m._id.toString() !== room.owner.toString())
                .map(m => m._id.toString())
        );

        const sanitizedRecords = (records || []).map(r => {
            const studentId = (r.student?._id || r.student || '').toString();
            const status = ['Present', 'Absent', 'Late'].includes(r.status) ? r.status : 'Present';
            return {
                student: studentId,
                status,
                remarks: (r.remarks || '').trim(),
                markedAt: new Date()
            };
        }).filter(r => mongoose.Types.ObjectId.isValid(r.student));

        let session;
        if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
            session = await Attendance.findOne({ _id: sessionId, roomId });
        } else {
            // Find existing session for date with same title or fallback
            session = await Attendance.findOne({ roomId, date, title });
        }

        if (session) {
            session.records = sanitizedRecords;
            session.title = title || session.title;
            session.sessionType = sessionType || session.sessionType;
            session.startTime = startTime || session.startTime;
            session.endTime = endTime || session.endTime;
            session.thresholdPercentage = thresholdPercentage || session.thresholdPercentage;
            session.takenBy = req.user._id;
            await session.save();
        } else {
            session = await Attendance.create({
                roomId,
                date,
                title,
                sessionType,
                startTime,
                endTime,
                takenBy: req.user._id,
                thresholdPercentage,
                records: sanitizedRecords
            });
        }

        // Real-time Socket.IO Broadcast to room
        if (req.io) {
            req.io.to(`room_${roomId}`).emit('attendance_updated', {
                roomId,
                date,
                sessionId: session._id,
                sessionTitle: session.title,
                totalStudents: sanitizedRecords.length
            });
        }

        // Notify absent / late students
        for (const record of sanitizedRecords) {
            if (record.status === 'Absent' || record.status === 'Late') {
                await notificationService.createNotification({
                    recipient: record.student,
                    actor: req.user._id,
                    type: "attendance_marked",
                    title: `Attendance Marked: ${record.status}`,
                    message: `You were marked ${record.status} for ${session.title} on ${date}.`,
                    entityType: "attendance",
                    entityId: session._id,
                    roomId,
                    io: req.io
                }).catch(() => {});
            }
        }

        res.status(200).json({ 
            success: true, 
            message: "Attendance saved successfully", 
            attendance: session 
        });
    } catch (error) {
        console.error("markAttendance error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

// 2. Get All Sessions for a Room (With Filters)
exports.getRoomSessions = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { startDate, endDate, sessionType, search } = req.query;

        const userRole = (req.user?.role || 'student').toLowerCase();
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });

        const isMember = room.owner.toString() === req.user._id.toString() || room.members?.some(m => m.toString() === req.user._id.toString());
        if (!isMember) {
            return res.status(403).json({ success: false, message: "Not authorized to view room attendance." });
        }

        const filter = { roomId };
        if (startDate && endDate) {
            filter.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            filter.date = { $gte: startDate };
        } else if (endDate) {
            filter.date = { $lte: endDate };
        }

        if (sessionType && sessionType !== 'all') {
            filter.sessionType = sessionType;
        }

        let sessions = await Attendance.find(filter)
            .populate('takenBy', 'fullname email')
            .populate('records.student', 'fullname email')
            .sort({ date: -1, createdAt: -1 });

        if (search) {
            const searchLower = search.toLowerCase();
            sessions = sessions.filter(s => 
                s.title?.toLowerCase().includes(searchLower) || 
                s.date?.includes(searchLower)
            );
        }

        // If student is requesting, sanitize records to include only their own record
        if (userRole === 'student') {
            sessions = sessions.map(s => {
                const myRecord = s.records.find(r => r.student?._id?.toString() === req.user._id.toString() || r.student?.toString() === req.user._id.toString());
                return {
                    _id: s._id,
                    roomId: s.roomId,
                    title: s.title,
                    sessionType: s.sessionType,
                    date: s.date,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    isLocked: s.isLocked,
                    myRecord: myRecord ? { status: myRecord.status, remarks: myRecord.remarks } : { status: 'Absent', remarks: 'No record' }
                };
            });
        }

        res.status(200).json({ success: true, sessions });
    } catch (error) {
        console.error("getRoomSessions error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 3. Get Attendance by Specific Date
exports.getAttendanceByDate = async (req, res) => {
    try {
        const { roomId, date } = req.params;
        const userRole = (req.user?.role || 'student').toLowerCase();

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });

        const isTeacher = await isAuthorizedTeacher(req.user, roomId);

        const attendance = await Attendance.findOne({ roomId, date })
            .populate('records.student', 'fullname email')
            .populate('takenBy', 'fullname email');

        if (!attendance) {
            return res.status(200).json({ success: true, attendance: null, message: "No attendance session for this date." });
        }

        if (!isTeacher) {
            // Student: Only return personal record
            const myRecord = attendance.records.find(r => r.student?._id?.toString() === req.user._id.toString() || r.student?.toString() === req.user._id.toString());
            return res.status(200).json({
                success: true,
                attendance: {
                    _id: attendance._id,
                    roomId: attendance.roomId,
                    title: attendance.title,
                    date: attendance.date,
                    sessionType: attendance.sessionType,
                    myRecord: myRecord || { status: 'Absent', remarks: 'No record' }
                }
            });
        }

        res.status(200).json({ success: true, attendance });
    } catch (error) {
        console.error("getAttendanceByDate error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 4. Update an Existing Session
exports.updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, sessionType, startTime, endTime, isLocked, records, thresholdPercentage } = req.body;

        const session = await Attendance.findById(id);
        if (!session) return res.status(404).json({ success: false, message: "Session not found." });

        const authorized = await isAuthorizedTeacher(req.user, session.roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Unauthorized to update this session." });
        }

        if (title !== undefined) session.title = title;
        if (sessionType !== undefined) session.sessionType = sessionType;
        if (startTime !== undefined) session.startTime = startTime;
        if (endTime !== undefined) session.endTime = endTime;
        if (isLocked !== undefined) session.isLocked = isLocked;
        if (thresholdPercentage !== undefined) session.thresholdPercentage = thresholdPercentage;

        if (Array.isArray(records)) {
            session.records = records.map(r => ({
                student: r.student?._id || r.student,
                status: ['Present', 'Absent', 'Late'].includes(r.status) ? r.status : 'Present',
                remarks: (r.remarks || '').trim(),
                markedAt: new Date()
            }));
        }

        session.takenBy = req.user._id;
        await session.save();

        if (req.io) {
            req.io.to(`room_${session.roomId}`).emit('attendance_updated', {
                roomId: session.roomId,
                sessionId: session._id,
                date: session.date,
                sessionTitle: session.title
            });
        }

        res.status(200).json({ success: true, message: "Session updated successfully.", session });
    } catch (error) {
        console.error("updateSession error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

// 5. Delete an Attendance Session
exports.deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Attendance.findById(id);
        if (!session) return res.status(404).json({ success: false, message: "Session not found." });

        const authorized = await isAuthorizedTeacher(req.user, session.roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this session." });
        }

        await Attendance.findByIdAndDelete(id);

        if (req.io) {
            req.io.to(`room_${session.roomId}`).emit('attendance_updated', {
                roomId: session.roomId,
                sessionId: id,
                deleted: true
            });
        }

        res.status(200).json({ success: true, message: "Attendance session deleted." });
    } catch (error) {
        console.error("deleteSession error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 6. Get Attendance Report for a Classroom (Teacher)
exports.getRoomAttendanceReport = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { startDate, endDate } = req.query;

        const room = await Room.findById(roomId).populate('members', 'fullname email role');
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        
        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Only teachers can view classroom reports" });
        }

        const filter = { roomId };
        if (startDate && endDate) {
            filter.date = { $gte: startDate, $lte: endDate };
        }

        const attendances = await Attendance.find(filter).sort({ date: 1, createdAt: 1 });
        const totalClasses = attendances.length;

        // Filter out non-students and teacher
        const students = room.members.filter(m => 
            (m.role || 'student').toLowerCase() === 'student' && 
            m._id.toString() !== room.owner.toString()
        );

        const studentStats = {};
        students.forEach(student => {
            studentStats[student._id.toString()] = {
                student: { _id: student._id, fullname: student.fullname, email: student.email },
                present: 0,
                absent: 0,
                late: 0,
                total: totalClasses,
                sessionDetails: []
            };
        });

        attendances.forEach(att => {
            students.forEach(student => {
                const sid = student._id.toString();
                const record = att.records.find(r => r.student.toString() === sid);
                const status = record ? record.status : 'Absent';
                const remarks = record ? record.remarks : 'No record';

                if (studentStats[sid]) {
                    if (status === 'Present') studentStats[sid].present++;
                    else if (status === 'Absent') studentStats[sid].absent++;
                    else if (status === 'Late') studentStats[sid].late++;

                    studentStats[sid].sessionDetails.push({
                        sessionId: att._id,
                        title: att.title,
                        date: att.date,
                        sessionType: att.sessionType,
                        status,
                        remarks
                    });
                }
            });
        });

        const report = Object.values(studentStats).map(stat => {
            const percentage = totalClasses > 0 ? Math.round(((stat.present + stat.late) / totalClasses) * 100) : 0;
            const purePresentPercentage = totalClasses > 0 ? Math.round((stat.present / totalClasses) * 100) : 0;
            const isBelowThreshold = percentage < 75;
            return { ...stat, percentage, purePresentPercentage, isBelowThreshold };
        });

        // Summary metrics
        const totalStudents = students.length;
        const avgPercentage = report.length > 0 ? Math.round(report.reduce((sum, r) => sum + r.percentage, 0) / report.length) : 0;
        const lowAttendanceCount = report.filter(r => r.isBelowThreshold).length;

        res.status(200).json({ 
            success: true, 
            totalClasses, 
            totalStudents, 
            avgPercentage, 
            lowAttendanceCount, 
            sessions: attendances.map(a => ({ _id: a._id, title: a.title, date: a.date, sessionType: a.sessionType })),
            report 
        });
    } catch (error) {
        console.error("getRoomAttendanceReport error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 7. Get Attendance Analytics & Metrics (Teacher Dashboard)
exports.getRoomAttendanceStats = async (req, res) => {
    try {
        const { roomId } = req.params;
        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) return res.status(403).json({ success: false, message: "Unauthorized." });

        const room = await Room.findById(roomId).populate('members', 'fullname email role');
        if (!room) return res.status(404).json({ success: false, message: "Room not found." });

        const attendances = await Attendance.find({ roomId }).sort({ date: 1 });
        const totalSessions = attendances.length;

        const students = room.members.filter(m => (m.role || 'student').toLowerCase() === 'student' && m._id.toString() !== room.owner.toString());

        let totalPresentMarks = 0;
        let totalAbsentMarks = 0;
        let totalLateMarks = 0;

        // Session-wise trend
        const sessionTrend = attendances.map(att => {
            let p = 0, a = 0, l = 0;
            att.records.forEach(r => {
                if (r.status === 'Present') p++;
                else if (r.status === 'Absent') a++;
                else if (r.status === 'Late') l++;
            });
            totalPresentMarks += p;
            totalAbsentMarks += a;
            totalLateMarks += l;
            const totalRecorded = p + a + l;
            const percent = totalRecorded > 0 ? Math.round(((p + l) / totalRecorded) * 100) : 0;
            return {
                sessionId: att._id,
                date: att.date,
                title: att.title,
                sessionType: att.sessionType,
                present: p,
                absent: a,
                late: l,
                percentage: percent
            };
        });

        const totalRecordsCount = totalPresentMarks + totalAbsentMarks + totalLateMarks;
        const overallClassPercentage = totalRecordsCount > 0 
            ? Math.round(((totalPresentMarks + totalLateMarks) / totalRecordsCount) * 100) 
            : 0;

        res.status(200).json({
            success: true,
            totalSessions,
            totalStudents: students.length,
            overallClassPercentage,
            totals: {
                present: totalPresentMarks,
                absent: totalAbsentMarks,
                late: totalLateMarks
            },
            sessionTrend
        });
    } catch (error) {
        console.error("getRoomAttendanceStats error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 8. Get Attendance for Logged In Student (Student View)
exports.getStudentAttendance = async (req, res) => {
    try {
        const studentId = req.user._id;
        const { roomId: specificRoomId } = req.query;

        let roomFilter = { members: studentId };
        if (specificRoomId && mongoose.Types.ObjectId.isValid(specificRoomId)) {
            roomFilter._id = specificRoomId;
        }

        const rooms = await Room.find(roomFilter).populate('owner', 'fullname email');
        const roomIds = rooms.map(r => r._id);

        const attendances = await Attendance.find({ roomId: { $in: roomIds } })
            .populate('roomId', 'name code')
            .sort({ date: -1, createdAt: -1 });

        const subjectStats = {};
        rooms.forEach(room => {
            subjectStats[room._id.toString()] = {
                room: { _id: room._id, name: room.name, code: room.code, teacher: room.owner?.fullname || 'Teacher' },
                totalClasses: 0,
                present: 0,
                absent: 0,
                late: 0,
                recentSessions: []
            };
        });

        const history = [];

        attendances.forEach(att => {
            const rid = att.roomId?._id?.toString() || att.roomId?.toString();
            if (subjectStats[rid]) {
                subjectStats[rid].totalClasses++;
                
                const myRecord = att.records.find(r => r.student?.toString() === studentId.toString() || r.student?._id?.toString() === studentId.toString());
                const status = myRecord ? myRecord.status : 'Absent';
                const remarks = myRecord ? myRecord.remarks : 'No record';

                if (status === 'Present') subjectStats[rid].present++;
                else if (status === 'Absent') subjectStats[rid].absent++;
                else if (status === 'Late') subjectStats[rid].late++;

                const sessionItem = {
                    sessionId: att._id,
                    roomName: att.roomId.name || 'Class',
                    sessionTitle: att.title,
                    sessionType: att.sessionType,
                    date: att.date,
                    startTime: att.startTime,
                    endTime: att.endTime,
                    status,
                    remarks
                };

                subjectStats[rid].recentSessions.push(sessionItem);
                history.push(sessionItem);
            }
        });

        let overallTotal = 0;
        let overallAttended = 0;
        let overallPresentOnly = 0;
        let overallLate = 0;
        let overallAbsent = 0;

        const subjects = Object.values(subjectStats).map(stat => {
            const percentage = stat.totalClasses > 0 ? Math.round(((stat.present + stat.late) / stat.totalClasses) * 100) : 0;
            overallTotal += stat.totalClasses;
            overallAttended += (stat.present + stat.late);
            overallPresentOnly += stat.present;
            overallLate += stat.late;
            overallAbsent += stat.absent;
            const isBelowThreshold = percentage < 75;
            return { ...stat, percentage, isBelowThreshold };
        });

        const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

        // Sort history by date descending
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Weekly / Monthly Trend for Student
        const dateMap = {};
        history.forEach(h => {
            if (!dateMap[h.date]) dateMap[h.date] = { date: h.date, present: 0, total: 0 };
            dateMap[h.date].total++;
            if (h.status === 'Present' || h.status === 'Late') dateMap[h.date].present++;
        });
        const trend = Object.values(dateMap).slice(0, 15).reverse();

        res.status(200).json({ 
            success: true, 
            overallPercentage,
            overallTotal,
            overallAttended,
            totals: {
                present: overallPresentOnly,
                late: overallLate,
                absent: overallAbsent
            },
            subjects,
            trend,
            history: history.slice(0, 100)
        });
    } catch (error) {
        console.error("getStudentAttendance error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 9. Export Attendance Report as CSV Data
exports.exportAttendanceCSV = async (req, res) => {
    try {
        const { roomId } = req.params;
        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) return res.status(403).json({ success: false, message: "Unauthorized." });

        const room = await Room.findById(roomId).populate('members', 'fullname email role');
        if (!room) return res.status(404).json({ success: false, message: "Room not found." });

        const attendances = await Attendance.find({ roomId }).sort({ date: 1, createdAt: 1 });
        const students = room.members.filter(m => (m.role || 'student').toLowerCase() === 'student' && m._id.toString() !== room.owner.toString());

        // Header Row: Student Name, Email, [Date 1 (Session Title)], [Date 2...], Total, Present, Late, Absent, %
        let csv = `Student Name,Email`;
        attendances.forEach(att => {
            csv += `,"${att.date} (${att.title || 'Session'})"`;
        });
        csv += `,Total Sessions,Present,Late,Absent,Attendance %\n`;

        students.forEach(student => {
            const sid = student._id.toString();
            let p = 0, l = 0, a = 0;
            let row = `"${student.fullname}","${student.email}"`;

            attendances.forEach(att => {
                const rec = att.records.find(r => r.student.toString() === sid);
                const status = rec ? rec.status : 'Absent';
                if (status === 'Present') p++;
                else if (status === 'Late') l++;
                else a++;
                row += `,"${status}"`;
            });

            const total = attendances.length;
            const pct = total > 0 ? Math.round(((p + l) / total) * 100) : 0;
            row += `,${total},${p},${l},${a},${pct}%\n`;
            csv += row;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`attendance_${room.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error("exportAttendanceCSV error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
