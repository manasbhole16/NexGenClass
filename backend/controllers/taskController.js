const Task = require("../models/task-model");
const { sendMail } = require("../utils/mailer");
const { isAiConfigured } = require("../utils/aiClient");
const { generateTaskDraftFromPrompt } = require("../services/aiGeneration");

// Create Task
module.exports.createTask = async (req, res) => {
    try {
        console.log("== CREATE TASK START ==");
        console.log("Body:", req.body);
        console.log("User:", req.user?._id);

        const { title, description, priority, tags, dueDate, status, order, roomId, maxMarks, taskType, category, subtasks, rubric } = req.body;

        if (!title) return res.status(400).json({ message: "Title is required" });

        const isPersonal = roomId === 'personal';

        // Log the decision
        console.log("Is Personal Mode:", isPersonal);

        const task = await Task.create({
            title,
            description,
            priority: priority || 'Medium',
            tags: tags || [],
            dueDate: dueDate || null,
            status: status || 'Todo',
            order: order || 0,
            room: (isPersonal || !roomId) ? null : roomId,
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
            maxMarks: maxMarks || 100,
            taskType: taskType || 'assignment',
            category: category || ''
        });

        console.log("Task saved to DB:", task._id);

        if (req.io) {
            req.io.emit("taskCreated", task);
            console.log("Socket event taskCreated emitted");
        }

        if (req.user?.email) {
            const scopeLabel = task.room ? "Class task" : "Personal task";
            const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleString() : "No due date";
            const text = [
                `Hi ${req.user.fullname || "there"},`,
                "",
                "A new task was created.",
                `Title: ${task.title}`,
                `Type: ${task.taskType || "assignment"}`,
                `Scope: ${scopeLabel}`,
                `Due: ${dueLabel}`
            ].join("\n");

            sendMail({
                to: req.user.email,
                subject: `New task: ${task.title}`,
                text
            }).catch((err) => {
                console.error("New task email failed:", err.message);
            });
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
        const { roomId } = req.query;
        console.log("== GET TASKS START ==", { roomId });

        let query = {};

        if (roomId === 'personal') {
            query = { room: null, owner: req.user._id };
        } else if (roomId === 'all') {
            const Room = require("../models/room-model");
            const rooms = await Room.find({ members: req.user._id });
            const roomIds = rooms.map(r => r._id);
            query = { $or: [{ room: null, owner: req.user._id }, { room: { $in: roomIds } }] };
        } else if (roomId) {
            query = { room: roomId };
        } else {
            return res.status(400).json({ message: "Room ID or personal flag required" });
        }

        const tasks = await Task.find(query).sort({ order: 1, createdAt: -1 });
        console.log(`Found ${tasks.length} tasks`);
        res.json({ success: true, count: tasks.length, tasks });
    } catch (err) {
        console.error("Get Tasks Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

// Update Task
module.exports.updateTask = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (req.body.dueDate !== undefined) {
            const incomingDueDate = req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null;
            const existingDueDate = task.dueDate ? task.dueDate.toISOString() : null;
            if (incomingDueDate !== existingDueDate) {
                req.body.deadlineReminderSentAt = null;
            }
        }

        task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (req.io) req.io.emit("taskUpdated", task);

        res.json({ success: true, task });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Task
module.exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (req.io) req.io.emit("taskDeleted", { id: req.params.id, roomId: task.room || 'personal' });

        res.json({ success: true, message: "Task deleted" });
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
