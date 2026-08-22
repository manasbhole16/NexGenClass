const File = require("../models/file-model");
const Room = require("../models/room-model");
const Task = require("../models/task-model");
const Submission = require("../models/submission-model");
const fileStorageService = require("../services/fileStorageService");
const { validateFile, inferCategory, sanitizeFilename } = require("../utils/fileValidation");
const notificationService = require("../services/notificationService");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

/**
 * Check if user is an authorized member or instructor of a room
 */
async function checkRoomAccess(userId, userRole, roomId) {
    if (!roomId) return { authorized: true, isTeacher: false };
    if (!mongoose.Types.ObjectId.isValid(roomId)) return { authorized: false, isTeacher: false };

    const room = await Room.findById(roomId);
    if (!room) return { authorized: false, isTeacher: false };

    const isOwner = room.owner && room.owner.toString() === userId.toString();
    const isTeacher = userRole === "teacher" && (isOwner || (room.members && room.members.some(m => m.toString() === userId.toString())));
    const isMember = isOwner || (room.members && room.members.some(m => m.toString() === userId.toString()));

    return { authorized: isMember, isTeacher, isOwner, room };
}

/**
 * Check if user can access a specific file
 */
async function canAccessFile(user, file) {
    if (!file || file.deletedAt) return false;

    // Direct owner can always access
    if (file.uploadedBy && file.uploadedBy.toString() === user._id.toString()) {
        return true;
    }

    // If file belongs to a room
    if (file.roomId) {
        const { authorized, isTeacher } = await checkRoomAccess(user._id, user.role, file.roomId);
        if (!authorized) return false;

        // If it's a submission attachment, only the student owner or the room teacher can access
        if (file.entityType === "submission_attachment" || file.visibility === "private") {
            if (isTeacher) return true;
            if (file.uploadedBy.toString() === user._id.toString()) return true;
            return false;
        }

        // Classroom resources are accessible to all enrolled members
        return true;
    }

    // Non-room files only accessible to uploader
    return file.uploadedBy && file.uploadedBy.toString() === user._id.toString();
}

/**
 * 1. Upload Single or Multiple Files
 */
exports.uploadFiles = async (req, res) => {
    try {
        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        const { roomId, entityType = "classroom_resource", entityId = null, category, description, visibility = "classroom" } = req.body;

        // If room is specified, verify access
        let isTeacher = false;
        if (roomId && roomId !== "personal") {
            const access = await checkRoomAccess(req.user._id, req.user.role, roomId);
            if (!access.authorized) {
                return res.status(403).json({ success: false, message: "Not authorized to upload files to this classroom" });
            }
            isTeacher = access.isTeacher;

            // Students cannot upload public classroom resources
            if (entityType === "classroom_resource" && !isTeacher) {
                return res.status(403).json({ success: false, message: "Only teachers can upload general classroom resources" });
            }
        }

        const createdFiles = [];
        const roomSubfolder = roomId && roomId !== "personal" ? `room_${roomId}` : "general";

        for (const fileObj of files) {
            // Validation
            const validation = validateFile({
                originalname: fileObj.originalname,
                size: fileObj.size,
                mimetype: fileObj.mimetype
            });

            if (!validation.valid) {
                return res.status(400).json({ success: false, message: validation.error });
            }

            // Storage
            const stored = await fileStorageService.uploadFile({
                buffer: fileObj.buffer,
                originalname: validation.sanitizedName,
                mimetype: fileObj.mimetype,
                size: fileObj.size,
                subfolder: roomSubfolder
            });

            // Metadata Document
            const finalCategory = category || stored.category;
            const newFile = await File.create({
                originalName: stored.originalName,
                storedName: stored.storedName,
                mimeType: stored.mimeType,
                extension: stored.extension,
                size: stored.size,
                storageProvider: stored.storageProvider,
                storageKey: stored.storageKey,
                url: stored.url,
                uploadedBy: req.user._id,
                roomId: roomId && roomId !== "personal" ? roomId : null,
                visibility: visibility || (entityType === "submission_attachment" ? "private" : "classroom"),
                category: finalCategory,
                entityType: entityType || "classroom_resource",
                entityId: entityId && mongoose.Types.ObjectId.isValid(entityId) ? entityId : null,
                description: description || "",
                referenceCount: 1
            });

            const populated = await File.findById(newFile._id)
                .populate("uploadedBy", "fullname email role")
                .populate("roomId", "name code section");

            createdFiles.push(populated);
        }

        // Socket.IO real-time notification to classroom members (if classroom resource)
        if (req.io && roomId && roomId !== "personal" && entityType === "classroom_resource") {
            req.io.to(roomId.toString()).emit("file:uploaded", {
                roomId,
                files: createdFiles,
                uploader: { _id: req.user._id, fullname: req.user.fullname }
            });
        }

        res.status(201).json({
            success: true,
            message: `${createdFiles.length} file(s) uploaded successfully`,
            files: createdFiles,
            file: createdFiles[0] // convenient single-file accessor
        });
    } catch (error) {
        console.error("uploadFiles error:", error);
        res.status(500).json({ success: false, message: error.message || "File upload failed" });
    }
};

/**
 * 2. Add External Link / Google Drive Link as Classroom Resource
 */
exports.addExternalLink = async (req, res) => {
    try {
        const { title, url, roomId, description, category } = req.body;
        if (!title || !title.trim() || !url || !url.trim()) {
            return res.status(400).json({ success: false, message: "Title and URL are required" });
        }

        if (roomId && roomId !== "personal") {
            const access = await checkRoomAccess(req.user._id, req.user.role, roomId);
            if (!access.authorized || !access.isTeacher) {
                return res.status(403).json({ success: false, message: "Only teachers can add external classroom resources" });
            }
        }

        const cleanTitle = sanitizeFilename(title.trim());
        const ext = path.extname(url).toLowerCase();
        const finalCategory = category || inferCategory("", ext);

        const newFile = await File.create({
            originalName: cleanTitle,
            storedName: `ext_${Date.now()}_${cleanTitle}`,
            mimeType: "text/uri-list",
            extension: ext || ".link",
            size: 0,
            storageProvider: "local",
            storageKey: url.trim(),
            url: url.trim(),
            uploadedBy: req.user._id,
            roomId: roomId && roomId !== "personal" ? roomId : null,
            visibility: "classroom",
            category: finalCategory,
            entityType: "classroom_resource",
            description: description || "",
            isExternalLink: true,
            externalUrl: url.trim(),
            referenceCount: 1
        });

        const populated = await File.findById(newFile._id)
            .populate("uploadedBy", "fullname email role")
            .populate("roomId", "name code section");

        if (req.io && roomId && roomId !== "personal") {
            req.io.to(roomId.toString()).emit("file:uploaded", {
                roomId,
                files: [populated],
                uploader: { _id: req.user._id, fullname: req.user.fullname }
            });
        }

        res.status(201).json({
            success: true,
            message: "External resource added successfully",
            file: populated
        });
    } catch (error) {
        console.error("addExternalLink error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to add external resource" });
    }
};

/**
 * 3. List Files with Filters, Search, Sort, and Pagination
 */
exports.getFiles = async (req, res) => {
    try {
        const { roomId, category, search, entityType, uploader, sort = "newest", page = 1, limit = 20 } = req.query;

        const query = { deletedAt: null };

        let isTeacher = false;
        if (roomId && roomId !== "personal") {
            const access = await checkRoomAccess(req.user._id, req.user.role, roomId);
            if (!access.authorized) {
                return res.status(403).json({ success: false, message: "Not authorized to view files for this classroom" });
            }
            isTeacher = access.isTeacher;
            query.roomId = roomId;
        } else {
            // Personal files or user's own uploads
            query.uploadedBy = req.user._id;
        }

        // Student privacy filter: students only see classroom resources or their own private uploads
        if (!isTeacher && query.roomId) {
            query.$or = [
                { visibility: "classroom" },
                { uploadedBy: req.user._id }
            ];
        }

        if (category && category !== "all") {
            query.category = category;
        }

        if (entityType && entityType !== "all") {
            query.entityType = entityType;
        }

        if (uploader && mongoose.Types.ObjectId.isValid(uploader)) {
            query.uploadedBy = uploader;
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { originalName: searchRegex },
                    { description: searchRegex },
                    { tags: searchRegex }
                ]
            });
        }

        // Sorting
        let sortObj = { createdAt: -1 };
        if (sort === "oldest") sortObj = { createdAt: 1 };
        else if (sort === "name_asc") sortObj = { originalName: 1 };
        else if (sort === "name_desc") sortObj = { originalName: -1 };
        else if (sort === "size_asc") sortObj = { size: 1 };
        else if (sort === "size_desc") sortObj = { size: -1 };

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (parsedPage - 1) * parsedLimit;

        const [files, total] = await Promise.all([
            File.find(query)
                .populate("uploadedBy", "fullname email role")
                .populate("roomId", "name code section")
                .sort(sortObj)
                .skip(skip)
                .limit(parsedLimit),
            File.countDocuments(query)
        ]);

        res.json({
            success: true,
            files,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit) || 1
        });
    } catch (error) {
        console.error("getFiles error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch files" });
    }
};

/**
 * 4. Get File Metadata by ID
 */
exports.getFileById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid File ID" });
        }

        const file = await File.findById(id)
            .populate("uploadedBy", "fullname email role")
            .populate("roomId", "name code section");

        if (!file || file.deletedAt) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const accessible = await canAccessFile(req.user, file);
        if (!accessible) {
            return res.status(403).json({ success: false, message: "Access denied to this file" });
        }

        res.json({ success: true, file });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 5. Preview / Stream File Inline
 */
exports.previewFile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid File ID" });
        }

        const file = await File.findById(id);
        if (!file || file.deletedAt) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const accessible = await canAccessFile(req.user, file);
        if (!accessible) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        if (file.isExternalLink) {
            return res.redirect(file.externalUrl);
        }

        const filePath = await fileStorageService.getFilePath(file.storageKey);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Physical file missing on server" });
        }

        res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader("X-Content-Type-Options", "nosniff");

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (error) {
        console.error("previewFile error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 6. Download File Attachment
 */
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid File ID" });
        }

        const file = await File.findById(id);
        if (!file || file.deletedAt) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const accessible = await canAccessFile(req.user, file);
        if (!accessible) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        if (file.isExternalLink) {
            return res.redirect(file.externalUrl);
        }

        const filePath = await fileStorageService.getFilePath(file.storageKey);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Physical file missing on server" });
        }

        res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader("Content-Length", file.size);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (error) {
        console.error("downloadFile error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 7. Update File (Rename, Description, Category)
 */
exports.updateFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { originalName, description, category, tags } = req.body;

        const file = await File.findById(id);
        if (!file || file.deletedAt) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const isUploader = file.uploadedBy.toString() === req.user._id.toString();
        let isTeacher = false;
        if (file.roomId) {
            const access = await checkRoomAccess(req.user._id, req.user.role, file.roomId);
            isTeacher = access.isTeacher;
        }

        if (!isUploader && !isTeacher) {
            return res.status(403).json({ success: false, message: "Not authorized to update this file" });
        }

        if (originalName && originalName.trim()) {
            file.originalName = sanitizeFilename(originalName.trim());
        }
        if (description !== undefined) {
            file.description = String(description).trim();
        }
        if (category) {
            file.category = category;
        }
        if (Array.isArray(tags)) {
            file.tags = tags.map(t => String(t).trim()).filter(Boolean);
        }

        await file.save();

        const populated = await File.findById(file._id)
            .populate("uploadedBy", "fullname email role")
            .populate("roomId", "name code section");

        if (req.io && file.roomId) {
            req.io.to(file.roomId.toString()).emit("file:updated", {
                roomId: file.roomId,
                file: populated
            });
        }

        res.json({ success: true, message: "File updated successfully", file: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 8. Delete File (Soft-Delete with Reference Protection)
 */
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await File.findById(id);
        if (!file || file.deletedAt) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const isUploader = file.uploadedBy.toString() === req.user._id.toString();
        let isTeacher = false;
        if (file.roomId) {
            const access = await checkRoomAccess(req.user._id, req.user.role, file.roomId);
            isTeacher = access.isTeacher;
        }

        if (!isUploader && !isTeacher) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this file" });
        }

        // Soft deletion preserves integrity of historical assignments/submissions
        file.deletedAt = new Date();
        await file.save();

        if (req.io && file.roomId) {
            req.io.to(file.roomId.toString()).emit("file:deleted", {
                roomId: file.roomId,
                fileId: file._id
            });
        }

        res.json({ success: true, message: "File removed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 9. Reuse Existing Classroom Resource for Assignment / Material
 */
exports.reuseResource = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await File.findById(id);
        if (!file || file.deletedAt) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        const accessible = await canAccessFile(req.user, file);
        if (!accessible) {
            return res.status(403).json({ success: false, message: "Not authorized to access this resource" });
        }

        file.referenceCount = (file.referenceCount || 1) + 1;
        await file.save();

        res.json({
            success: true,
            message: "Resource attached successfully",
            attachment: {
                title: file.originalName,
                fileName: file.originalName,
                fileUrl: file.url || file.externalUrl,
                fileType: file.mimeType,
                fileId: file._id,
                size: file.size
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
