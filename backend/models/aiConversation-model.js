const mongoose = require("mongoose");

const aiMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    sources: [{
        title: { type: String, default: "" },
        section: { type: String, default: "" },
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null }
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const aiConversationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            default: null,
            index: true
        },
        title: {
            type: String,
            default: "Academic Study Session",
            trim: true
        },
        mode: {
            type: String,
            enum: ["study_assistant", "teaching_copilot", "document_chat", "exam_prep"],
            default: "study_assistant"
        },
        contextFileIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "File"
        }],
        messages: [aiMessageSchema],
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Indexes
aiConversationSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
aiConversationSchema.index({ roomId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model("AIConversation", aiConversationSchema);
