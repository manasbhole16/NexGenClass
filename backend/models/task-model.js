const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
        type: String,
        enum: ['Backlog', 'Todo', 'In Progress', 'Done'],
        default: 'Todo'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    tags: [{ type: String }],
    dueDate: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' }, // Optional: If null, it's a personal task
    order: { type: Number, default: 0 },
    subtasks: [{
        title: { type: String, required: true },
        completed: { type: Boolean, default: false }
    }],
    maxMarks: { type: Number, default: 100 },
    taskType: { 
        type: String, 
        enum: ['assignment', 'material', 'announcement'], 
        default: 'assignment' 
    },
    category: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
