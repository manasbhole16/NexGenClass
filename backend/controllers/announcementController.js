const Announcement = require("../models/announcement-model");
const Room = require("../models/room-model");
const notificationService = require("../services/notificationService");

// Get Stream Announcements for Room
module.exports.getAnnouncements = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Classroom not found" });

        const isMember = room.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: "Access denied: Not enrolled in class" });

        const announcements = await Announcement.find({ roomId })
            .populate('author', 'fullname email role')
            .populate('comments.author', 'fullname email role')
            .sort({ createdAt: -1 });

        res.json({ success: true, announcements });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create Announcement
module.exports.createAnnouncement = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { content, attachments } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Announcement text is required" });
        }

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Classroom not found" });

        const isMember = room.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: "Access denied: Not enrolled in class" });

        const isTeacher = room.owner.toString() === req.user._id.toString() || req.user.role === 'teacher';
        const whoCanPost = room.streamSettings?.whoCanPost || 'students_post_comment';

        if (!isTeacher && (whoCanPost === 'teachers_only' || whoCanPost === 'students_comment_only')) {
            return res.status(403).json({ message: "Only teachers are allowed to post announcements in this classroom." });
        }

        const announcement = await Announcement.create({
            roomId,
            author: req.user._id,
            authorName: req.user.fullname,
            authorRole: req.user.role,
            content: content.trim(),
            attachments: Array.isArray(attachments) ? attachments : []
        });

        const populatedAnnouncement = await Announcement.findById(announcement._id)
            .populate('author', 'fullname email role')
            .populate('comments.author', 'fullname email role');

        if (req.io) {
            req.io.to(roomId).emit("new_announcement", populatedAnnouncement);
        }

        // Notify enrolled classroom members
        const recipientIds = (room.members || []).filter(m => m.toString() !== req.user._id.toString());
        if (recipientIds.length > 0) {
            const notifs = recipientIds.map(recId => ({
                recipient: recId,
                actor: req.user._id,
                type: "announcement_created",
                title: "New Class Announcement",
                message: `${req.user.fullname} posted an announcement in "${room.name}".`,
                entityType: "announcement",
                entityId: populatedAnnouncement._id,
                roomId: room._id,
                metadata: { announcementId: populatedAnnouncement._id }
            }));
            await notificationService.createManyNotifications(notifs, req.io);
        }

        res.status(201).json({ success: true, announcement: populatedAnnouncement });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update Announcement
module.exports.updateAnnouncement = async (req, res) => {
    try {
        const { roomId, id } = req.params;
        const { content, attachments } = req.body;

        const announcement = await Announcement.findById(id);
        if (!announcement) return res.status(404).json({ message: "Announcement not found" });

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Classroom not found" });

        const isAuthor = announcement.author.toString() === req.user._id.toString();
        const isOwner = room.owner.toString() === req.user._id.toString();

        if (!isAuthor && !isOwner) {
            return res.status(403).json({ message: "Unauthorized to edit this announcement" });
        }

        if (content) announcement.content = content.trim();
        if (attachments !== undefined) announcement.attachments = attachments;

        await announcement.save();

        const populatedAnnouncement = await Announcement.findById(id)
            .populate('author', 'fullname email role')
            .populate('comments.author', 'fullname email role');

        if (req.io) {
            req.io.to(roomId).emit("announcement_updated", populatedAnnouncement);
        }

        res.json({ success: true, announcement: populatedAnnouncement });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Announcement
module.exports.deleteAnnouncement = async (req, res) => {
    try {
        const { roomId, id } = req.params;

        const announcement = await Announcement.findById(id);
        if (!announcement) return res.status(404).json({ message: "Announcement not found" });

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Classroom not found" });

        const isAuthor = announcement.author.toString() === req.user._id.toString();
        const isOwner = room.owner.toString() === req.user._id.toString();

        if (!isAuthor && !isOwner) {
            return res.status(403).json({ message: "Unauthorized to delete this announcement" });
        }

        await Announcement.findByIdAndDelete(id);

        if (req.io) {
            req.io.to(roomId).emit("announcement_deleted", { announcementId: id, roomId });
        }

        res.json({ success: true, message: "Announcement deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add Comment to Announcement
module.exports.addComment = async (req, res) => {
    try {
        const { roomId, id } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Comment content is required" });
        }

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Classroom not found" });

        const isMember = room.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: "Access denied: Not enrolled in class" });

        const isTeacher = room.owner.toString() === req.user._id.toString() || req.user.role === 'teacher';
        const whoCanPost = room.streamSettings?.whoCanPost || 'students_post_comment';

        if (!isTeacher && whoCanPost === 'teachers_only') {
            return res.status(403).json({ message: "Only teachers are allowed to comment in this classroom." });
        }

        const announcement = await Announcement.findById(id);
        if (!announcement) return res.status(404).json({ message: "Announcement not found" });

        announcement.comments.push({
            author: req.user._id,
            authorName: req.user.fullname,
            authorRole: req.user.role,
            content: content.trim(),
            createdAt: new Date()
        });

        await announcement.save();

        const populatedAnnouncement = await Announcement.findById(id)
            .populate('author', 'fullname email role')
            .populate('comments.author', 'fullname email role');

        if (req.io) {
            req.io.to(roomId).emit("new_announcement_comment", {
                roomId,
                announcementId: id,
                comment: populatedAnnouncement.comments[populatedAnnouncement.comments.length - 1]
            });
        }

        // Notify announcement author if not the commenter
        if (announcement.author && announcement.author.toString() !== req.user._id.toString()) {
            await notificationService.createNotification({
                recipient: announcement.author,
                actor: req.user._id,
                type: "announcement_comment",
                title: "New Comment on Announcement",
                message: `${req.user.fullname} commented on your announcement: "${content.trim().slice(0, 50)}${content.trim().length > 50 ? '...' : ''}"`,
                entityType: "announcement",
                entityId: announcement._id,
                roomId: room._id,
                metadata: { announcementId: announcement._id },
                io: req.io
            });
        }

        res.status(201).json({ success: true, announcement: populatedAnnouncement });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Comment
module.exports.deleteComment = async (req, res) => {
    try {
        const { roomId, id, commentId } = req.params;

        const announcement = await Announcement.findById(id);
        if (!announcement) return res.status(404).json({ message: "Announcement not found" });

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Classroom not found" });

        const comment = announcement.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const isAuthor = comment.author.toString() === req.user._id.toString();
        const isOwner = room.owner.toString() === req.user._id.toString();

        if (!isAuthor && !isOwner) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        announcement.comments = announcement.comments.filter(c => c._id.toString() !== commentId.toString());
        await announcement.save();

        if (req.io) {
            req.io.to(roomId).emit("announcement_comment_deleted", {
                announcementId: id,
                commentId
            });
        }

        res.json({ success: true, message: "Comment deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
