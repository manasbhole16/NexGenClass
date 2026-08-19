const mongoose = require("mongoose");
const LiveSession = require("../models/liveSession-model");
const Room = require("../models/room-model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getRoomAccess = async (roomId, userId) => {
    if (!isValidId(roomId)) return null;
    const room = await Room.findById(roomId).select("owner members name");
    if (!room) return null;

    const userIdStr = userId.toString();
    const isOwner = room.owner.toString() === userIdStr;
    const isMember = room.members.some((member) => member.toString() === userIdStr);

    return { room, isOwner, isMember };
};

// Teacher creates a scheduled/live-ready session for a classroom.
exports.createLiveSession = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { title, description = "", scheduledAt = null } = req.body;

        if (!isValidId(roomId)) {
            return res.status(400).json({ message: "Invalid classroom ID." });
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Live session title is required." });
        }
        if (scheduledAt && Number.isNaN(new Date(scheduledAt).getTime())) {
            return res.status(400).json({ message: "Invalid scheduled time." });
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
            status: scheduledAt ? "scheduled" : "scheduled"
        });

        if (req.io) {
            req.io.to(roomId).emit("liveSessionCreated", session);
        }

        return res.status(201).json({ success: true, session });
    } catch (error) {
        console.error("createLiveSession error:", error);
        return res.status(500).json({ message: "Failed to create live session." });
    }
};

// Teacher starts a session. The server records the authoritative start time.
exports.startLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Live session not found." });

        if (!isValidId(session.roomId)) return res.status(400).json({ message: "Invalid classroom ID." });
        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (req.user.role !== "teacher" || !access.isOwner || session.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the session instructor can start this session." });
        }
        if (session.status === "live") return res.json({ success: true, session });
        if (session.status !== "scheduled") {
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

        if (req.io) req.io.to(session.roomId.toString()).emit("liveSessionStarted", session);
        return res.json({ success: true, session });
    } catch (error) {
        console.error("startLiveSession error:", error);
        return res.status(500).json({ message: "Failed to start live session." });
    }
};

// End a live session and close all currently open participant records.
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
        session.participants.forEach((participant) => {
            if (!participant.leftAt) participant.leftAt = endedAt;
        });
        await session.save();

        if (req.io) req.io.to(session.roomId.toString()).emit("liveSessionEnded", session);
        return res.json({ success: true, session });
    } catch (error) {
        console.error("endLiveSession error:", error);
        return res.status(500).json({ message: "Failed to end live session." });
    }
};

// Classroom member joins the currently live session.
exports.joinLiveSession = async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Live session not found." });

        const access = await getRoomAccess(session.roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (!access.isMember && !access.isOwner) {
            return res.status(403).json({ message: "You are not enrolled in this classroom." });
        }
        if (session.status !== "live") {
            return res.status(400).json({ message: "This live session is not currently running." });
        }

        const userIdStr = req.user._id.toString();
        const existing = session.participants.find((participant) => participant.userId.toString() === userIdStr && !participant.leftAt);
        if (!existing) {
            const previous = session.participants.find((participant) => participant.userId.toString() === userIdStr && participant.leftAt);
            if (previous) {
                previous.joinedAt = new Date();
                previous.leftAt = null;
            } else {
                session.participants.push({ userId: req.user._id, joinedAt: new Date() });
            }
            await session.save();
        }

        const participantIds = session.participants
            .filter((participant) => !participant.leftAt)
            .map((participant) => participant.userId);

        if (req.io) {
            req.io.to(session.roomId.toString()).emit("liveParticipantUpdate", {
                sessionId: session._id,
                participantIds
            });
        }

        return res.json({ success: true, session, joined: true });
    } catch (error) {
        console.error("joinLiveSession error:", error);
        return res.status(500).json({ message: "Failed to join live session." });
    }
};

// Participant leaves without ending the classroom session.
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
        }

        return res.json({ success: true, left: Boolean(participant) });
    } catch (error) {
        console.error("leaveLiveSession error:", error);
        return res.status(500).json({ message: "Failed to leave live session." });
    }
};

// Returns the active live session for a classroom, if one exists.
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

// Teacher can view recent session history for the classroom.
exports.getLiveSessionHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        const access = await getRoomAccess(roomId, req.user._id);
        if (!access) return res.status(404).json({ message: "Classroom not found." });
        if (req.user.role !== "teacher" || !access.isOwner) {
            return res.status(403).json({ message: "Only the classroom instructor can view live session history." });
        }

        const sessions = await LiveSession.find({ roomId })
            .populate("hostId", "fullname email role")
            .sort({ createdAt: -1 })
            .limit(50);

        return res.json({ success: true, sessions });
    } catch (error) {
        console.error("getLiveSessionHistory error:", error);
        return res.status(500).json({ message: "Failed to retrieve live session history." });
    }
};
