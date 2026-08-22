const mongoose = require("mongoose");

const matchedSubmissionSchema = new mongoose.Schema(
    {
        submissionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Submission",
            required: true
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        studentName: {
            type: String,
            default: "Peer Student"
        },
        similarityPercent: {
            type: Number,
            required: true,
            default: 0
        },
        matchedPhrasesCount: {
            type: Number,
            default: 0
        }
    },
    { _id: false }
);

const matchedSegmentSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true
        },
        sourceSubmissionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Submission"
        },
        sourceStudentName: {
            type: String,
            default: "Peer Student"
        },
        sourcePhrase: {
            type: String,
            default: ""
        },
        length: {
            type: Number,
            default: 0
        },
        similarityScore: {
            type: Number,
            default: 0
        }
    },
    { _id: false }
);

const plagiarismReportSchema = new mongoose.Schema(
    {
        submissionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Submission",
            required: true,
            index: true
        },
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
            index: true
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "unsupported", "failed"],
            default: "pending",
            index: true
        },
        analyzedAt: {
            type: Date,
            default: Date.now
        },
        overallSimilarityPercent: {
            type: Number,
            default: 0,
            index: true
        },
        exactMatchPercent: {
            type: Number,
            default: 0
        },
        phraseMatchPercent: {
            type: Number,
            default: 0
        },
        tokenSimilarityPercent: {
            type: Number,
            default: 0
        },
        confidence: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "high"
        },
        category: {
            type: String,
            enum: ["low", "moderate", "high", "very_high", "unsupported"],
            default: "low"
        },
        matchedSubmissions: {
            type: [matchedSubmissionSchema],
            default: []
        },
        matchedSegments: {
            type: [matchedSegmentSchema],
            default: []
        },
        analyzedWordCount: {
            type: Number,
            default: 0
        },
        sourceType: {
            type: String,
            enum: ["text", "document", "code", "mixed"],
            default: "text"
        },
        engineVersion: {
            type: String,
            default: "plagiarism_engine_2.0"
        },
        thresholds: {
            lowMax: { type: Number, default: 14 },
            moderateMax: { type: Number, default: 29 },
            highMax: { type: Number, default: 49 }
        },
        isReviewed: {
            type: Boolean,
            default: false
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        reviewNotes: {
            type: String,
            default: ""
        },
        errorMessage: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

plagiarismReportSchema.index({ taskId: 1, studentId: 1 });
plagiarismReportSchema.index({ roomId: 1, taskId: 1 });
plagiarismReportSchema.index({ submissionId: 1, analyzedAt: -1 });

module.exports = mongoose.model("PlagiarismReport", plagiarismReportSchema);
