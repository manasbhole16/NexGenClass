const Task = require("../models/task-model");

// Create Task
module.exports.createTask = async (req, res) => {
    try {
        console.log("== CREATE TASK START ==");
        console.log("Body:", req.body);
        console.log("User:", req.user?._id);

        const { title, description, priority, tags, dueDate, status, order, roomId } = req.body;

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
            owner: req.user._id
        });

        console.log("Task saved to DB:", task._id);

        if (req.io) {
            req.io.emit("taskCreated", task);
            console.log("Socket event taskCreated emitted");
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
            console.log("Fetching personal tasks for:", req.user._id);
        } else if (roomId) {
            query = { room: roomId };
            console.log("Fetching room tasks for room:", roomId);
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
