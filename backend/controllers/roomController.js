const Room = require("../models/room-model");
const crypto = require("crypto");

// Create Room
module.exports.createRoom = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Only teachers can create classrooms." });
        }
        const { name } = req.body;
        // Generate unique 6-char code
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();

        const room = await Room.create({
            name,
            code,
            owner: req.user._id,
            members: [req.user._id]
        });

        res.status(201).json({ success: true, room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Join Room
module.exports.joinRoom = async (req, res) => {
    try {
        const { code } = req.body;
        const room = await Room.findOne({ code });

        if (!room) return res.status(404).json({ message: "Invalid Room Code" });

        // Add user if not already member
        if (!room.members.includes(req.user._id)) {
            room.members.push(req.user._id);
            await room.save();
        }

        res.json({ success: true, room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get User Rooms
module.exports.getUserRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.user._id }).populate('members', 'fullname email');
        res.json({ success: true, rooms });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Room (Admin only)
module.exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only Admin can delete the room" });
        }

        await Room.findByIdAndDelete(req.params.roomId);
        res.json({ success: true, message: "Room deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Kick Member (Admin only)
module.exports.kickMember = async (req, res) => {
    try {
        const { roomId, userId } = req.body;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only Admin can kick members" });
        }

        if (userId === room.owner.toString()) {
            return res.status(400).json({ message: "Admin cannot be kicked" });
        }

        room.members = room.members.filter(m => m.toString() !== userId.toString());
        await room.save();

        res.json({ success: true, message: "Member kicked successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
