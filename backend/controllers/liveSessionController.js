const mongoose = require("mongoose");
const LiveSession = require("../models/liveSession-model");
const Room = require("../models/room-model");
const Attendance = require("../models/attendance-model");
const File = require("../models/file-model");
const notificationService = require("../services/notificationService");
const fileStorageService = require("../services/fileStorageService");
const { sanitizeFilename } = require("../utils/fileValidation");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getRoomAccess = async (roomId, userId) => {
    if (!isValidId(roomId)) return null;
    const room = await Room.findById(roomId).select("owner members name code");
    if (!room) return null;

    const userIdStr = userId.toString();
    const isOwner = room.owner && room.owner.toString() === userIdStr;
    const isMember = isOwner || (room.members && room.members.some((member) => member.toString() === userIdStr));

    return { room, isOwner, isMember };
};

// 1. Create a live session (Teacher only)
exports.createLiveSession = async (req, res) => {
    try {
        const roomId = req.params.roomId || req.body.roomId;
        const { title, description = "", scheduledAt = null, whiteboardEnabled = true, studentsCanDraw = true } = req.body;

        if (!isValidId(roomId)) {
            return res.status(400).json({ message: "Invalid classroom ID." });
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Live session title is required." });
        }

        const access = await getRoomAccess(roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (req.user.role !== "teacher" || !access.isOwner) {
            return res.status(403).json({ message: "Only the classroom instructor can create live sessions." });
        }

        const activeSession = await LiveSession.findOne({ roomId, status: "live" });
        if (activeSession) {
            return res.status(409).json({ message: "A live session is already running for this classroom.", session: activeSession });
        }

        const session = await LiveSession.create({
            roomId,
            hostId: req.user._id,
            title: title.trim(),
            description: description.trim(),
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            status: "scheduled",
            whiteboardEnabled,
            studentsCanDraw
        });

        // Send notifications to enrolled students
        try {
            const students = (access.room.members || []).filter(m => m.toString() !== req.user._id.toString());
            const notifs = students.map(stId => ({
                recipient: stId,
                actor: req.user._id,
                type: "live_class_scheduled",
                title: `Live Class Scheduled: ${session.title}`,
                message: `${req.user.fullname} scheduled a live class for ${access.room.name}${scheduledAt ? ` on ${new Date(scheduledAt).toLocaleString()}` : ''}.`,
                entityType: "live_session",
                entityId: session._id,
                roomId,
                actionUrl: `/room/${roomId}?tab=live`,
                dedupKey: `live_class_sched:${session._id}:${stId}`
            }));
            await notificationService.createManyNotifications(notifs, req.io);
        } catch (notifErr) {
            console.warn("Live session notification warning:", notifErr.message);
        }

        if (req.io) {
            req.io.to(roomId.toString()).emit("liveSessionCreated", session);
        }

        return res.status(201).json({ success: true, session });
    } catch (error) {
        console.error("createLiveSession error:", error);
        return res.status(500).json({ message: "Failed to create live session." });
    }
};

// 2. Start a live session (Teacher only)
exports.startLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Live session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (req.user.role !== "teacher" || !access.isOwner || session.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the session instructor can start this session." });
        }
        if (session.status === "live") return res.json({ success: true, session });
        if (session.status === "ended" || session.status === "cancelled") {
            return res.status(400).json({ message: `Session cannot be started from status '${session.status}'.` });
        }

        const anotherLive = await LiveSession.findOne({
            roomId: session.roomId,
            status: "live",
            _id: { $ne: session._id }
        });
        if (anotherLive) {
            return res.status(409).json({ message: "Another live session is already running in this classroom." });
        }

        session.status = "live";
        session.startedAt = new Date();
        session.endedAt = null;
        await session.save();

        // Notify enrolled students
        try {
            const students = (access.room.members || []).filter(m => m.toString() !== req.user._id.toString());
            const notifs = students.map(stId => ({
                recipient: stId,
                actor: req.user._id,
                type: "live_class_started",
                title: `🔴 Live Class Started: ${session.title}`,
                message: `${req.user.fullname} has started the live class for ${access.room.name}. Join now!`,
                entityType: "live_session",
                entityId: session._id,
                roomId: session.roomId,
                actionUrl: `/room/${session.roomId}?tab=live`,
                dedupKey: `live_class_start:${session._id}:${stId}`
            }));
            await notificationService.createManyNotifications(notifs, req.io);
        } catch (notifErr) {
            console.warn("Live session started notification warning:", notifErr.message);
        }

        if (req.io) req.io.to(session.roomId.toString()).emit("liveSessionStarted", session);
        return res.json({ success: true, session });
    } catch (error) {
        console.error("startLiveSession error:", error);
        return res.status(500).json({ message: "Failed to start live session." });
    }
};

// 3. End a live session + Generate Attendance 2.0 (Teacher only)
exports.endLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Live session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (req.user.role !== "teacher" || !access.isOwner || session.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the session instructor can end this session." });
        }
        if (session.status !== "live") {
            return res.status(400).json({ message: "Only a live session can be ended." });
        }

        const endedAt = new Date();
        session.status = "ended";
        session.endedAt = endedAt;

        // Close all participant timestamps
        session.participants.forEach((participant) => {
            if (!participant.leftAt) participant.leftAt = endedAt;
        });

        // Auto-generate Attendance 2.0 record
        if (!session.attendanceGenerated) {
            try {
                const totalDurationMs = Math.max(endedAt.getTime() - (session.startedAt ? new Date(session.startedAt).getTime() : endedAt.getTime()), 60000);
                const roomFull = await Room.findById(session.roomId).populate("members", "_id fullname email");
                const students = (roomFull?.members || []).filter(m => m._id.toString() !== session.hostId.toString());

                const attendanceRecords = [];
                for (const st of students) {
                    const stIdStr = st._id.toString();
                    const participations = session.participants.filter(p => p.userId.toString() === stIdStr);

                    let studentDurationMs = 0;
                    participations.forEach(p => {
                        const start = new Date(p.joinedAt).getTime();
                        const end = (p.leftAt ? new Date(p.leftAt).getTime() : endedAt.getTime());
                        studentDurationMs += Math.max(end - start, 0);
                    });

                    const pct = (studentDurationMs / totalDurationMs) * 100;
                    let status = "Absent";
                    if (pct >= 75) status = "Present";
                    else if (pct >= 25) status = "Late";

                    attendanceRecords.push({
                        student: st._id,
                        status,
                        remarks: `Live Class (${Math.round(pct)}% participation)`,
                        markedAt: endedAt
                    });
                }

                if (attendanceRecords.length > 0) {
                    const todayStr = endedAt.toISOString().split("T")[0];
                    const attDoc = await Attendance.create({
                        roomId: session.roomId,
                        title: `Live Session: ${session.title}`,
                        sessionType: "lecture",
                        date: todayStr,
                        startTime: session.startedAt ? new Date(session.startedAt).toTimeString().slice(0, 5) : "",
                        endTime: endedAt.toTimeString().slice(0, 5),
                        takenBy: session.hostId,
                        thresholdPercentage: 75,
                        records: attendanceRecords
                    });

                    session.attendanceGenerated = true;
                    session.attendanceSessionId = attDoc._id;
                }
            } catch (attErr) {
                console.error("Failed to generate live attendance record:", attErr);
            }
        }

        await session.save();

        if (req.io) {
            req.io.to(session.roomId.toString()).emit("liveSessionEnded", session);
            req.io.to(`live_session_${session._id}`).emit("live:session-ended", { sessionId: session._id });
        }

        return res.json({ success: true, session });
    } catch (error) {
        console.error("endLiveSession error:", error);
        return res.status(500).json({ message: "Failed to end live session." });
    }
};

// 4. Join live session (Enrolled member)
exports.joinLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Live session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || (!access.isMember && !access.isOwner)) {
            return res.status(403).json({ message: "You are not enrolled in this classroom." });
        }
        if (session.status !== "live") {
            return res.status(400).json({ message: "This live session is not currently running." });
        }

        const userIdStr = req.user._id.toString();
        const existing = session.participants.find((p) => p.userId.toString() === userIdStr && !p.leftAt);
        if (!existing) {
            session.participants.push({ userId: req.user._id, joinedAt: new Date() });
            await session.save();
        }

        const participantIds = session.participants
            .filter((p) => !p.leftAt)
            .map((p) => p.userId);

        if (req.io) {
            req.io.to(session.roomId.toString()).emit("liveParticipantUpdate", {
                sessionId: session._id,
                participantIds
            });
            req.io.to(`live_session_${session._id}`).emit("live:peer-joined", {
                userId: req.user._id,
                fullname: req.user.fullname,
                role: req.user.role
            });
        }

        return res.json({ success: true, session, joined: true });
    } catch (error) {
        console.error("joinLiveSession error:", error);
        return res.status(500).json({ message: "Failed to join live session." });
    }
};

// 5. Leave live session
exports.leaveLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Live session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || (!access.isMember && !access.isOwner)) {
            return res.status(403).json({ message: "You are not enrolled in this classroom." });
        }

        const participant = session.participants.find(
            (entry) => entry.userId.toString() === req.user._id.toString() && !entry.leftAt
        );
        if (participant) {
            participant.leftAt = new Date();
            await session.save();
        }

        if (req.io) {
            req.io.to(session.roomId.toString()).emit("liveParticipantLeft", {
                sessionId: session._id,
                userId: req.user._id
            });
            req.io.to(`live_session_${session._id}`).emit("live:peer-left", {
                userId: req.user._id,
                fullname: req.user.fullname
            });
        }

        return res.json({ success: true, left: Boolean(participant) });
    } catch (error) {
        console.error("leaveLiveSession error:", error);
        return res.status(500).json({ message: "Failed to leave live session." });
    }
};

// 6. Get single live session details
exports.getLiveSessionById = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId)
            .populate("hostId", "fullname email role")
            .populate("participants.userId", "fullname email role")
            .populate("recordingFileId", "originalName size mimeType url");

        if (!session) return res.status(404).json({ message: "Live session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || (!access.isMember && !access.isOwner)) {
            return res.status(403).json({ message: "You are not enrolled in this classroom." });
        }

        return res.json({ success: true, session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to get live session", error: error.message });
    }
};

// 7. Teacher kicks a participant
exports.kickParticipant = async (req, res) => {
    try {
        const { sessionId, userId } = req.params;
        const session = await LiveSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || req.user.role !== "teacher" || !access.isOwner || session.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the session instructor can remove participants." });
        }

        const p = session.participants.find(entry => entry.userId.toString() === userId.toString() && !entry.leftAt);
        if (p) {
            p.leftAt = new Date();
            await session.save();
        }

        if (req.io) {
            req.io.to(`live_session_${session._id}`).emit("live:participant-kicked", {
                userId,
                sessionId: session._id,
                message: "You have been removed from this live session by the instructor."
            });
        }

        return res.json({ success: true, message: "Participant removed." });
    } catch (err) {
        return res.status(500).json({ message: "Failed to kick participant", error: err.message });
    }
};

// 8. Teacher toggles whiteboard drawing permission
exports.toggleWhiteboardPermission = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { studentsCanDraw } = req.body;

        const session = await LiveSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || req.user.role !== "teacher" || !access.isOwner) {
            return res.status(403).json({ message: "Only instructors can modify whiteboard permissions." });
        }

        session.studentsCanDraw = Boolean(studentsCanDraw);
        await session.save();

        if (req.io) {
            req.io.to(`live_session_${session._id}`).emit("live:whiteboard-permission-updated", {
                studentsCanDraw: session.studentsCanDraw
            });
        }

        return res.json({ success: true, studentsCanDraw: session.studentsCanDraw });
    } catch (err) {
        return res.status(500).json({ message: "Failed to update whiteboard permissions", error: err.message });
    }
};

// 9. Save whiteboard vector state
exports.saveWhiteboardState = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { whiteboardState } = req.body;

        const session = await LiveSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || (!access.isMember && !access.isOwner)) {
            return res.status(403).json({ message: "Unauthorized." });
        }

        if (Array.isArray(whiteboardState)) {
            session.whiteboardState = whiteboardState.slice(-500); // capped at 500 recent operations
            await session.save();
        }

        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to save whiteboard state", error: err.message });
    }
};

// 10. Live Attendance Query
exports.getLiveAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await LiveSession.findById(sessionId).populate("participants.userId", "fullname email role");
        if (!session) return res.status(404).json({ message: "Session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || (!access.isMember && !access.isOwner)) {
            return res.status(403).json({ message: "Unauthorized." });
        }

        const isTeacher = req.user.role === "teacher" && access.isOwner;
        const now = session.endedAt ? new Date(session.endedAt) : new Date();
        const totalDurationMs = session.startedAt ? Math.max(now.getTime() - new Date(session.startedAt).getTime(), 1000) : 0;

        if (isTeacher) {
            // Full participant matrix
            const roster = (session.participants || []).map(p => {
                const start = new Date(p.joinedAt).getTime();
                const end = p.leftAt ? new Date(p.leftAt).getTime() : now.getTime();
                const durationMinutes = Math.round(Math.max(end - start, 0) / 60000);
                const pct = totalDurationMs > 0 ? Math.round((Math.max(end - start, 0) / totalDurationMs) * 100) : 0;

                return {
                    userId: p.userId?._id,
                    fullname: p.userId?.fullname,
                    email: p.userId?.email,
                    joinedAt: p.joinedAt,
                    leftAt: p.leftAt,
                    durationMinutes,
                    participationPct: pct,
                    status: pct >= 75 ? "Present" : pct >= 25 ? "Late" : "Absent"
                };
            });

            return res.json({ success: true, isTeacher: true, roster, totalDurationMs });
        } else {
            // Student gets ONLY own record
            const myRecords = (session.participants || []).filter(p => p.userId?._id?.toString() === req.user._id.toString());
            let myDurationMs = 0;
            myRecords.forEach(p => {
                const start = new Date(p.joinedAt).getTime();
                const end = p.leftAt ? new Date(p.leftAt).getTime() : now.getTime();
                myDurationMs += Math.max(end - start, 0);
            });

            const myPct = totalDurationMs > 0 ? Math.round((myDurationMs / totalDurationMs) * 100) : 0;
            return res.json({
                success: true,
                isTeacher: false,
                record: {
                    durationMinutes: Math.round(myDurationMs / 60000),
                    participationPct: myPct,
                    status: myPct >= 75 ? "Present" : myPct >= 25 ? "Late" : "Absent"
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ message: "Failed to get live attendance", error: err.message });
    }
};

// 11. Attach recording to LiveSession (Integrated with File model)
exports.attachRecording = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await LiveSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access || req.user.role !== "teacher" || !access.isOwner) {
            return res.status(403).json({ message: "Only instructors can upload lecture recordings." });
        }

        const files = req.files || (req.file ? [req.file] : []);
        if (!files.length) {
            return res.status(400).json({ message: "No recording file uploaded." });
        }

        const file = files[0];
        const saved = await fileStorageService.uploadFile({
            buffer: file.buffer,
            originalname: file.originalname || `Lecture_Recording_${session.title}.webm`,
            mimetype: file.mimetype || "video/webm",
            size: file.size || (file.buffer ? file.buffer.length : 0),
            subfolder: session.roomId.toString()
        });

        const fileDoc = await File.create({
            originalName: saved.originalName,
            storedName: saved.storedName,
            mimeType: saved.mimeType,
            extension: saved.extension || ".webm",
            size: saved.size,
            storageProvider: saved.storageProvider,
            storageKey: saved.storageKey,
            url: saved.url,
            uploadedBy: req.user._id,
            roomId: session.roomId,
            visibility: "classroom",
            category: "video",
            entityType: "live_recording",
            entityId: session._id,
            description: `Live Class Recording for ${session.title}`
        });

        session.recordingFileId = fileDoc._id;
        session.recordingStatus = "completed";
        session.recordingMetadata = {
            duration: req.body.duration || 0,
            mimeType: fileDoc.mimeType,
            size: fileDoc.size
        };
        await session.save();

        return res.status(201).json({ success: true, session, file: fileDoc });
    } catch (err) {
        console.error("attachRecording error:", err);
        return res.status(500).json({ message: "Failed to attach recording", error: err.message });
    }
};

// 12. Returns the active live session for a classroom
exports.getCurrentLiveSession = async (req, res) => {
    try {
        const { roomId } = req.params;
        const access = await getRoomAccess(roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (!access.isMember && !access.isOwner) {
            return res.status(403).json({ message: "You are not enrolled in this classroom." });
        }

        const session = await LiveSession.findOne({ roomId, status: "live" })
            .populate("hostId", "fullname email role")
            .populate("participants.userId", "fullname email role");

        return res.json({ success: true, session: session || null });
    } catch (error) {
        console.error("getCurrentLiveSession error:", error);
        return res.status(500).json({ message: "Failed to retrieve live session." });
    }
};

// 13. Returns recent session history for the classroom
exports.getLiveSessionHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        const access = await getRoomAccess(roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (!access.isMember && !access.isOwner) {
            return res.status(403).json({ message: "You are not enrolled in this classroom." });
        }

        const sessions = await LiveSession.find({ roomId })
            .populate("hostId", "fullname email role")
            .populate("recordingFileId", "originalName size mimeType url")
            .sort({ createdAt: -1 })
            .limit(50);

        return res.json({ success: true, sessions });
    } catch (error) {
        console.error("getLiveSessionHistory error:", error);
        return res.status(500).json({ message: "Failed to retrieve live session history." });
    }
};
