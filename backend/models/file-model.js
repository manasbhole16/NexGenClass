const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
    {
        originalName: {
            type: String,
            required: true,
            trim: true
        },
        storedName: {
            type: String,
            required: true,
            trim: true
        },
        mimeType: {
            type: String,
            required: true,
            default: "application/octet-stream"
        },
        extension: {
            type: String,
            lowercase: true,
            default: ""
        },
        size: {
            type: Number,
            required: true,
            default: 0
        },
        storageProvider: {
            type: String,
            enum: ["local", "s3", "cloudinary", "gcs"],
            default: "local"
        },
        storageKey: {
            type: String,
            required: true
        },
        url: {
            type: String,
            default: ""
        },
        uploadedBy: {
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
        visibility: {
            type: String,
            enum: ["classroom", "private", "public"],
            default: "classroom"
        },
        category: {
            type: String,
            enum: ["document", "pdf", "image", "video", "spreadsheet", "presentation", "archive", "code", "other"],
            default: "other",
            index: true
        },
        entityType: {
            type: String,
            enum: [
                "classroom_resource",
                "assignment_attachment",
                "material_attachment",
                "submission_attachment",
                "quiz_attachment",
                "form_attachment",
                "profile_asset",
                "general"
            ],
            default: "classroom_resource"
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        tags: [{
            type: String,
            trim: true
        }],
        referenceCount: {
            type: Number,
            default: 1
        },
        isExternalLink: {
            type: Boolean,
            default: false
        },
        externalUrl: {
            type: String,
            default: null
        },
        deletedAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Compound indexes for optimal classroom file querying, sorting, and category filters
fileSchema.index({ roomId: 1, deletedAt: 1, createdAt: -1 });
fileSchema.index({ roomId: 1, category: 1, deletedAt: 1 });
fileSchema.index({ uploadedBy: 1, deletedAt: 1, createdAt: -1 });
fileSchema.index({ roomId: 1, originalName: 1 });

module.exports = mongoose.model("File", fileSchema);
