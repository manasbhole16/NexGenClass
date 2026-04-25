const ChatMessage = require("../models/chatMessage-model");
const Room = require("../models/room-model");

exports.getChatHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await ChatMessage.find({ roomId })
            .sort({ createdAt: 1 })
            .limit(100);

        res.status(200).json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearChat = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);

        if (!room) return res.status(404).json({ success: false, message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only room owner can clear chat" });
        }

        await ChatMessage.deleteMany({ roomId });
        res.status(200).json({ success: true, message: "Chat cleared successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
