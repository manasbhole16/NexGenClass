const Room = require("../models/room-model");
const Task = require("../models/task-model");
const Submission = require("../models/submission-model");
const crypto = require("crypto");

// Helper to generate unique code
const generateUniqueCode = async () => {
    let code = '';
    let exists = true;
    while (exists) {
        code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const found = await Room.findOne({ code });
        if (!found) exists = false;
    }
    return code;
};

// Create Room
module.exports.createRoom = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Only teachers can create classrooms." });
        }
        const { name, section, subject, room, description, banner } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Classroom name is required." });
        }

        const code = await generateUniqueCode();

        const newRoom = await Room.create({
            name: name.trim(),
            section: (section || '').trim(),
            subject: (subject || '').trim(),
            room: (room || '').trim(),
            description: (description || '').trim(),
            banner: banner || 'purple',
            code,
            owner: req.user._id,
            members: [req.user._id]
        });

        const populatedRoom = await Room.findById(newRoom._id)
            .populate('owner', 'fullname email role')
            .populate('members', 'fullname email role');

        res.status(201).json({ success: true, room: populatedRoom });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Join Room
module.exports.joinRoom = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: "Please provide a class code." });
        }

        const normalizedCode = code.trim().toUpperCase();
        const room = await Room.findOne({ code: normalizedCode });

        if (!room) {
            return res.status(404).json({ message: "Invalid Room Code. No class found." });
        }

        if (room.joinEnabled === false) {
            return res.status(403).json({ message: "Class code joining has been disabled by the instructor." });
        }

        // Add user if not already member
        const isMember = room.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) {
            room.members.push(req.user._id);
            await room.save();
            if (req.io) {
                req.io.to(room._id.toString()).emit("student_joined", {
                    roomId: room._id,
                    user: { _id: req.user._id, fullname: req.user.fullname, email: req.user.email, role: req.user.role }
                });
            }
        }

        const populatedRoom = await Room.findById(room._id)
            .populate('owner', 'fullname email role')
            .populate('members', 'fullname email role');

        res.json({ success: true, room: populatedRoom });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get User Rooms
module.exports.getUserRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.user._id })
            .populate('owner', 'fullname email role')
            .populate('members', 'fullname email role')
            .sort({ createdAt: -1 });

        // Add task counts / next upcoming deadline for rich cards
        const roomIds = rooms.map(r => r._id);
        const now = new Date();
        const upcomingTasks = await Task.find({
            room: { $in: roomIds },
            dueDate: { $gte: now }
        }).sort({ dueDate: 1 });

        const enrichedRooms = rooms.map(r => {
            const rObj = r.toObject();
            const nextTask = upcomingTasks.find(t => t.room && t.room.toString() === r._id.toString());
            rObj.upcomingTask = nextTask ? {
                _id: nextTask._id,
                title: nextTask.title,
                dueDate: nextTask.dueDate,
                taskType: nextTask.taskType
            } : null;
            return rObj;
        });

        res.json({ success: true, rooms: enrichedRooms });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Room By ID
module.exports.getRoomById = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId)
            .populate('owner', 'fullname email role')
            .populate('members', 'fullname email role');

        if (!room) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        const isMember = room.members.some(m => m._id.toString() === req.user._id.toString());
        const isOwner = room.owner && room.owner._id.toString() === req.user._id.toString();

        if (!isMember && !isOwner) {
            return res.status(403).json({ message: "Access denied. You are not enrolled in this classroom." });
        }

        res.json({ success: true, room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update Room Details (Teacher only)
module.exports.updateRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only the instructor can update class details" });
        }

        const { name, section, subject, room: roomVenue, description, banner, archived } = req.body;
        if (name) room.name = name.trim();
        if (section !== undefined) room.section = section.trim();
        if (subject !== undefined) room.subject = subject.trim();
        if (roomVenue !== undefined) room.room = roomVenue.trim();
        if (description !== undefined) room.description = description.trim();
        if (banner !== undefined) room.banner = banner;
        if (archived !== undefined) room.archived = Boolean(archived);

        await room.save();

        const updatedRoom = await Room.findById(roomId)
            .populate('owner', 'fullname email role')
            .populate('members', 'fullname email role');

        if (req.io) {
            req.io.to(roomId).emit("classroom_updated", updatedRoom);
        }

        res.json({ success: true, room: updatedRoom });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Room Settings (Teacher only)
module.exports.getRoomSettings = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only the instructor can view full class settings." });
        }

        res.json({
            success: true,
            settings: {
                name: room.name,
                section: room.section,
                subject: room.subject,
                room: room.room,
                description: room.description,
                banner: room.banner,
                code: room.code,
                joinEnabled: room.joinEnabled,
                inviteLinkEnabled: room.inviteLinkEnabled,
                streamSettings: room.streamSettings,
                gradingSettings: room.gradingSettings,
                archived: room.archived
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update Room Settings (Teacher only)
module.exports.updateRoomSettings = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only the instructor can modify class settings." });
        }

        const {
            name, section, subject, room: roomVenue, description, banner,
            joinEnabled, inviteLinkEnabled, streamSettings, gradingSettings, archived
        } = req.body;

        if (name) room.name = name.trim();
        if (section !== undefined) room.section = section.trim();
        if (subject !== undefined) room.subject = subject.trim();
        if (roomVenue !== undefined) room.room = roomVenue.trim();
        if (description !== undefined) room.description = description.trim();
        if (banner !== undefined) room.banner = banner;
        if (joinEnabled !== undefined) room.joinEnabled = Boolean(joinEnabled);
        if (inviteLinkEnabled !== undefined) room.inviteLinkEnabled = Boolean(inviteLinkEnabled);
        if (archived !== undefined) room.archived = Boolean(archived);

        if (streamSettings) {
            if (streamSettings.whoCanPost) room.streamSettings.whoCanPost = streamSettings.whoCanPost;
            if (streamSettings.classworkOnStream) room.streamSettings.classworkOnStream = streamSettings.classworkOnStream;
            if (streamSettings.showDeletedItems !== undefined) room.streamSettings.showDeletedItems = Boolean(streamSettings.showDeletedItems);
        }

        if (gradingSettings) {
            if (gradingSettings.gradeCalculation) room.gradingSettings.gradeCalculation = gradingSettings.gradeCalculation;
            if (gradingSettings.showOverallGradeToStudents !== undefined) {
                room.gradingSettings.showOverallGradeToStudents = Boolean(gradingSettings.showOverallGradeToStudents);
            }
            if (Array.isArray(gradingSettings.gradeCategories)) {
                room.gradingSettings.gradeCategories = gradingSettings.gradeCategories;
            }
        }

        await room.save();

        const updatedRoom = await Room.findById(roomId)
            .populate('owner', 'fullname email role')
            .populate('members', 'fullname email role');

        if (req.io) {
            req.io.to(roomId).emit("classroom_settings_updated", updatedRoom);
        }

        res.json({ success: true, room: updatedRoom });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Regenerate Join Code (Teacher only)
module.exports.regenerateJoinCode = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only the instructor can regenerate the class code." });
        }

        const newCode = await generateUniqueCode();
        room.code = newCode;
        room.joinEnabled = true;
        await room.save();

        if (req.io) {
            req.io.to(roomId).emit("classroom_updated", { _id: room._id, code: newCode, joinEnabled: true });
        }

        res.json({ success: true, code: newCode, message: "Class code regenerated successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Toggle Join Code Enabled / Disabled (Teacher only)
module.exports.toggleJoinCode = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Only the instructor can toggle class code." });
        }

        const { enabled } = req.body;
        room.joinEnabled = enabled !== undefined ? Boolean(enabled) : !room.joinEnabled;
        await room.save();

        if (req.io) {
            req.io.to(roomId).emit("classroom_updated", { _id: room._id, joinEnabled: room.joinEnabled });
        }

        res.json({ success: true, joinEnabled: room.joinEnabled });
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
            return res.status(403).json({ message: "Unauthorized: Only the instructor can delete the class" });
        }

        await Room.findByIdAndDelete(req.params.roomId);

        if (req.io) {
            req.io.to(req.params.roomId).emit("classroom_deleted", { roomId: req.params.roomId });
        }

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

        if (req.io) {
            req.io.to(roomId).emit("student_removed", { roomId, userId });
        }

        res.json({ success: true, message: "Member kicked successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Unenroll from Room
module.exports.unenrollRoom = async (req, res) => {
    try {
        const { roomId } = req.body;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "Owner cannot unenroll from their own room. Delete it instead." });
        }

        room.members = room.members.filter(m => m.toString() !== req.user._id.toString());
        await room.save();

        if (req.io) {
            req.io.to(roomId).emit("student_removed", { roomId, userId: req.user._id });
        }

        res.json({ success: true, message: "Unenrolled successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Dashboard Summary (Real work items for Teacher / Student)
module.exports.getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        if (userRole === 'teacher') {
            // Find rooms owned by teacher
            const teacherRooms = await Room.find({ owner: userId });
            const roomIds = teacherRooms.map(r => r._id);

            // Find all tasks in these rooms
            const tasks = await Task.find({ room: { $in: roomIds } })
                .populate('room', 'name section')
                .sort({ dueDate: 1, createdAt: -1 });

            const taskIds = tasks.map(t => t._id);

            // Find submissions needing review
            const pendingSubmissions = await Submission.find({
                taskId: { $in: taskIds },
                status: { $in: ['submitted', 'late'] },
                $or: [{ marksAwarded: null }, { marksAwarded: { $exists: false } }]
            }).populate('studentId', 'fullname email')
              .populate('taskId', 'title maxMarks dueDate room');

            // Find recently due tasks
            const now = new Date();
            const recentlyDue = tasks.filter(t => t.dueDate && new Date(t.dueDate) <= now);
            const upcoming = tasks.filter(t => !t.dueDate || new Date(t.dueDate) > now);

            return res.json({
                success: true,
                role: 'teacher',
                summary: {
                    pendingGradingCount: pendingSubmissions.length,
                    pendingSubmissions: pendingSubmissions.slice(0, 10),
                    recentlyDueTasks: recentlyDue.slice(0, 10),
                    upcomingTasks: upcoming.slice(0, 10),
                    totalClassrooms: teacherRooms.length
                }
            });
        } else {
            // Student View
            const enrolledRooms = await Room.find({ members: userId, owner: { $ne: userId } });
            const roomIds = enrolledRooms.map(r => r._id);

            const tasks = await Task.find({ room: { $in: roomIds } })
                .populate('room', 'name section')
                .sort({ dueDate: 1 });

            const studentSubmissions = await Submission.find({
                studentId: userId,
                taskId: { $in: tasks.map(t => t._id) }
            });

            const subMap = new Map();
            studentSubmissions.forEach(s => subMap.set(s.taskId.toString(), s));

            const now = new Date();
            const upcomingTasks = [];
            const missingTasks = [];
            const completedTasks = [];

            tasks.forEach(t => {
                const sub = subMap.get(t._id.toString());
                const taskObj = {
                    _id: t._id,
                    title: t.title,
                    dueDate: t.dueDate,
                    taskType: t.taskType,
                    maxMarks: t.maxMarks,
                    room: t.room,
                    submission: sub || null
                };

                if (sub) {
                    completedTasks.push(taskObj);
                } else if (t.dueDate && new Date(t.dueDate) < now) {
                    missingTasks.push(taskObj);
                } else {
                    upcomingTasks.push(taskObj);
                }
            });

            return res.json({
                success: true,
                role: 'student',
                summary: {
                    upcomingTasks: upcomingTasks.slice(0, 10),
                    missingTasks: missingTasks.slice(0, 10),
                    completedTasks: completedTasks.slice(0, 10),
                    totalEnrolled: enrolledRooms.length
                }
            });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
