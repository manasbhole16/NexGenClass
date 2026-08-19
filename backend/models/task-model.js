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
    rubric: [{
        criterion: { type: String, trim: true },
        points: { type: Number, default: 0 },
        description: { type: String, trim: true }
    }],
    maxMarks: { type: Number, default: 100 },
    taskType: { 
        type: String, 
        enum: ['assignment', 'material', 'announcement'], 
        default: 'assignment' 
    },
    category: { type: String, trim: true },
    topic: { type: String, default: 'General', trim: true },
    attachments: [{
        title: { type: String, default: '' },
        fileUrl: { type: String, default: '' },
        fileName: { type: String, default: '' },
        fileType: { type: String, default: '' }
    }],
    isDraft: { type: Boolean, default: false },
    scheduledPublishAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // empty = all students
    deadlineReminderSentAt: { type: Date }
}, { timestamps: true });

taskSchema.index({ room: 1, topic: 1 });
taskSchema.index({ room: 1, dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
