const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: 'Instructor' },
    authorRole: { type: String, enum: ['teacher', 'student'], default: 'teacher' },
    content: { type: String, required: true, trim: true },
    attachments: [{
        title: { type: String, default: '' },
        url: { type: String, default: '' },
        fileType: { type: String, default: '' }
    }],
    comments: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorName: { type: String, default: 'Member' },
        authorRole: { type: String, enum: ['teacher', 'student'], default: 'student' },
        content: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

announcementSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model("Announcement", announcementSchema);
