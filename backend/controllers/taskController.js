const Task = require("../models/task-model");
const Room = require("../models/room-model");
const Submission = require("../models/submission-model");
const { sendMail } = require("../utils/mailer");
const { isAiConfigured } = require("../utils/aiClient");
const { generateTaskDraftFromPrompt } = require("../services/aiGeneration");

// Create Task
module.exports.createTask = async (req, res) => {
    try {
        const {
            title, description, priority, tags, dueDate, status, order, roomId,
            maxMarks, taskType, category, topic, subtasks, rubric, attachments,
            isDraft, scheduledPublishAt, assignedTo
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required" });
        }

        const isPersonal = !roomId || roomId === 'personal';

        // Server-Side RBAC Check for Classroom Tasks
        if (!isPersonal) {
            const room = await Room.findById(roomId);
            if (!room) {
                return res.status(404).json({ message: "Classroom not found" });
            }

            const isOwner = room.owner.toString() === req.user._id.toString();
            const isRoomTeacher = req.user.role === 'teacher' && (isOwner || room.members.some(m => m.toString() === req.user._id.toString()));

            if (!isOwner && !isRoomTeacher) {
                return res.status(403).json({ message: "Forbidden: Only the classroom instructor can create classroom assignments." });
            }
        }

        const draftFlag = Boolean(isDraft);
        const publishedDate = draftFlag ? null : new Date();

        const task = await Task.create({
            title: title.trim(),
            description: (description || '').trim(),
            priority: priority || 'Medium',
            tags: Array.isArray(tags) ? tags : [],
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'Todo',
            order: order || 0,
            room: isPersonal ? null : roomId,
            owner: req.user._id,
            subtasks: Array.isArray(subtasks)
                ? subtasks
                    .map(s => ({ title: String(s.title || s).trim(), completed: Boolean(s.completed) }))
                    .filter(s => s.title)
                : [],
            rubric: Array.isArray(rubric)
                ? rubric
                    .map(r => ({
                        criterion: String(r.criterion || "").trim(),
                        points: Number.isFinite(Number(r.points)) ? Number(r.points) : 0,
                        description: String(r.description || "").trim()
                    }))
                    .filter(r => r.criterion)
                : [],
            maxMarks: Number.isFinite(Number(maxMarks)) ? Number(maxMarks) : 100,
            taskType: taskType || 'assignment',
            category: (category || '').trim(),
            topic: (topic || 'General').trim() || 'General',
            attachments: Array.isArray(attachments) ? attachments : [],
            isDraft: draftFlag,
            scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
            publishedAt: publishedDate,
            assignedTo: Array.isArray(assignedTo) ? assignedTo : []
        });

        // Only emit and notify if not a draft
        if (!draftFlag) {
            if (req.io) {
                if (!isPersonal) {
                    req.io.to(roomId).emit("taskCreated", task);
                } else {
                    req.io.emit("taskCreated", task);
                }
            }

            if (req.user?.email && isPersonal) {
                const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleString() : "No due date";
                sendMail({
                    to: req.user.email,
                    subject: `New personal task: ${task.title}`,
                    text: `Task created: ${task.title}\nDue: ${dueLabel}`
                }).catch(() => {});
            }
        }

        res.status(201).json({ success: true, task });
    } catch (err) {
        console.error("Task Creation Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

// Get Tasks
module.exports.getTasks = async (req, res) => {
    try {
        const { roomId, topic, taskType, status } = req.query;

        let query = {};

        if (roomId === 'personal') {
            query = { room: null, owner: req.user._id };
        } else if (roomId === 'all') {
            const rooms = await Room.find({ members: req.user._id });
            const roomIds = rooms.map(r => r._id);

            if (req.user.role === 'student') {
                query = {
                    $or: [
                        { room: null, owner: req.user._id },
                        {
                            room: { $in: roomIds },
                            isDraft: { $ne: true },
                            $or: [
                                { assignedTo: { $exists: false } },
                                { assignedTo: { $size: 0 } },
                                { assignedTo: req.user._id }
                            ]
                        }
                    ]
                };
            } else {
                query = {
                    $or: [
                        { room: null, owner: req.user._id },
                        { room: { $in: roomIds } }
                    ]
                };
            }
        } else if (roomId) {
            const room = await Room.findById(roomId);
            if (!room) return res.status(404).json({ message: "Classroom not found" });

            const isMember = room.members.some(m => m.toString() === req.user._id.toString());
            const isOwner = room.owner.toString() === req.user._id.toString();

            if (!isMember && !isOwner) {
                return res.status(403).json({ message: "Access denied to this classroom" });
            }

            const isTeacher = isOwner || req.user.role === 'teacher';

            if (!isTeacher) {
                // Students can only see published assignments assigned to them
                query = {
                    room: roomId,
                    isDraft: { $ne: true },
                    $or: [
                        { assignedTo: { $exists: false } },
                        { assignedTo: { $size: 0 } },
                        { assignedTo: req.user._id }
                    ]
                };
            } else {
                // Teachers see all tasks in their room
                query = { room: roomId };
            }
        } else {
            return res.status(400).json({ message: "Room ID or personal flag required" });
        }

        // Apply optional filters
        if (topic && topic !== 'All') {
            query.topic = topic;
        }
        if (taskType) {
            query.taskType = taskType;
        }
        if (status) {
            query.status = status;
        }

        const tasks = await Task.find(query)
            .populate('owner', 'fullname email role')
            .sort({ order: 1, createdAt: -1 });

        res.json({ success: true, count: tasks.length, tasks });
    } catch (err) {
        console.error("Get Tasks Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

// Update Task
module.exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Server-Side RBAC
        if (task.room) {
            const room = await Room.findById(task.room);
            const isOwner = room && room.owner.toString() === req.user._id.toString();
            const isTaskOwner = task.owner && task.owner.toString() === req.user._id.toString();
            const isRoomTeacher = req.user.role === 'teacher' && room && (isOwner || room.members.some(m => m.toString() === req.user._id.toString()));

            if (!isOwner && !isTaskOwner && !isRoomTeacher) {
                return res.status(403).json({ message: "Forbidden: You are not authorized to edit this classroom task." });
            }
        } else {
            if (task.owner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Forbidden: You can only edit your own personal tasks." });
            }
        }

        if (req.body.dueDate !== undefined) {
            const incomingDueDate = req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null;
            const existingDueDate = task.dueDate ? task.dueDate.toISOString() : null;
            if (incomingDueDate !== existingDueDate) {
                req.body.deadlineReminderSentAt = null;
            }
        }

        // If publishing a draft
        if (task.isDraft && req.body.isDraft === false) {
            req.body.publishedAt = new Date();
        }

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (req.io) {
            const roomTarget = updatedTask.room ? updatedTask.room.toString() : 'personal';
            if (updatedTask.room) {
                req.io.to(roomTarget).emit("taskUpdated", updatedTask);
            } else {
                req.io.emit("taskUpdated", updatedTask);
            }
        }

        res.json({ success: true, task: updatedTask });
    } catch (err) {
        console.error("Task Update Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

// Delete Task
module.exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Server-Side RBAC
        if (task.room) {
            const room = await Room.findById(task.room);
            const isOwner = room && room.owner.toString() === req.user._id.toString();
            const isTaskOwner = task.owner && task.owner.toString() === req.user._id.toString();
            const isRoomTeacher = req.user.role === 'teacher' && room && (isOwner || room.members.some(m => m.toString() === req.user._id.toString()));

            if (!isOwner && !isTaskOwner && !isRoomTeacher) {
                return res.status(403).json({ message: "Forbidden: You are not authorized to delete this classroom task." });
            }
        } else {
            if (task.owner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Forbidden: You can only delete your own personal tasks." });
            }
        }

        await Task.findByIdAndDelete(req.params.id);
        await Submission.deleteMany({ taskId: req.params.id });

        if (req.io) {
            const roomTarget = task.room ? task.room.toString() : 'personal';
            if (task.room) {
                req.io.to(roomTarget).emit("taskDeleted", { id: req.params.id, roomId: roomTarget });
            } else {
                req.io.emit("taskDeleted", { id: req.params.id, roomId: 'personal' });
            }
        }

        res.json({ success: true, message: "Task deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// AI: Generate task draft from prompt
module.exports.generateTaskDraft = async (req, res) => {
    try {
        if (!isAiConfigured()) {
            return res.status(503).json({ message: "AI is not configured. Set NIM_BASE_URL, NIM_API_KEY, and NIM_MODEL." });
        }

        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: "Prompt is required" });

        const draft = await generateTaskDraftFromPrompt({
            prompt,
            timezone: process.env.APP_TIMEZONE || "UTC"
        });

        res.json({ success: true, draft });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
