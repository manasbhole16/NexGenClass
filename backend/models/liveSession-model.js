const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: {
            type: Date,
            default: null
        }
    },
    { _id: false }
);

const liveSessionSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },
        status: {
            type: String,
            enum: ["scheduled", "live", "ended", "cancelled"],
            default: "scheduled",
            index: true
        },
        scheduledAt: {
            type: Date,
            default: null
        },
        startedAt: {
            type: Date,
            default: null
        },
        endedAt: {
            type: Date,
            default: null
        },
        participants: {
            type: [participantSchema],
            default: []
        },
        whiteboardEnabled: {
            type: Boolean,
            default: true
        },
        studentsCanDraw: {
            type: Boolean,
            default: true
        },
        whiteboardState: {
            type: Array,
            default: []
        },
        recordingFileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            default: null
        },
        recordingStatus: {
            type: String,
            enum: ["none", "recording", "completed", "failed"],
            default: "none"
        },
        recordingMetadata: {
            duration: { type: Number, default: 0 },
            mimeType: { type: String, default: "video/webm" },
            size: { type: Number, default: 0 }
        },
        attendanceGenerated: {
            type: Boolean,
            default: false
        },
        attendanceSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
            default: null
        }
    },
    { timestamps: true }
);

liveSessionSchema.index({ roomId: 1, createdAt: -1 });
liveSessionSchema.index(
    { roomId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "live" }
    }
);

module.exports = mongoose.model("LiveSession", liveSessionSchema);
