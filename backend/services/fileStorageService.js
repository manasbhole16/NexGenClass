const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { sanitizeFilename, inferCategory } = require("../utils/fileValidation");

class FileStorageService {
    constructor() {
        this.provider = process.env.FILE_STORAGE_PROVIDER || "local";
        this.baseUploadDir = process.env.FILE_STORAGE_PATH 
            ? path.resolve(process.env.FILE_STORAGE_PATH)
            : path.join(__dirname, "../uploads");

        // Ensure base upload directory exists
        if (!fs.existsSync(this.baseUploadDir)) {
            fs.mkdirSync(this.baseUploadDir, { recursive: true });
        }
    }

    /**
     * Store file buffer to disk / storage provider
     */
    async uploadFile({ buffer, originalname, mimetype, size, subfolder = "" }) {
        if (!buffer) {
            throw new Error("File buffer is required for upload");
        }

        const sanitized = sanitizeFilename(originalname);
        const ext = path.extname(sanitized).toLowerCase();
        const randomPrefix = crypto.randomBytes(8).toString("hex");
        const storedName = `${Date.now()}_${randomPrefix}_${sanitized}`;

        const targetDir = subfolder 
            ? path.join(this.baseUploadDir, subfolder) 
            : this.baseUploadDir;

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, storedName);
        const relativeKey = subfolder ? path.join(subfolder, storedName) : storedName;

        // Write buffer to filesystem
        await fs.promises.writeFile(filePath, buffer);

        const category = inferCategory(mimetype, ext);
        const url = `/uploads/${relativeKey.replace(/\\/g, "/")}`;

        return {
            originalName: sanitized,
            storedName,
            mimeType: mimetype || "application/octet-stream",
            extension: ext,
            size: size || buffer.length,
            storageProvider: this.provider,
            storageKey: relativeKey,
            url,
            category
        };
    }

    /**
     * Retrieve absolute file path or stream for download/preview
     */
    async getFilePath(storageKey) {
        if (!storageKey) return null;
        // Normalize and prevent path traversal
        const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
        const fullPath = path.join(this.baseUploadDir, safeKey);

        if (!fullPath.startsWith(this.baseUploadDir)) {
            throw new Error("Security Violation: Path traversal attempt detected");
        }

        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
        return null;
    }

    /**
     * Read file buffer
     */
    async getFileBuffer(storageKey) {
        const filePath = await this.getFilePath(storageKey);
        if (!filePath) return null;
        return await fs.promises.readFile(filePath);
    }

    /**
     * Delete stored file
     */
    async deleteFile(storageKey) {
        try {
            const filePath = await this.getFilePath(storageKey);
            if (filePath && fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                return true;
            }
            return false;
        } catch (err) {
            console.error("File deletion error:", err);
            return false;
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(storageKey) {
        const filePath = await this.getFilePath(storageKey);
        return filePath !== null && fs.existsSync(filePath);
    }

    /**
     * Get file stats metadata
     */
    async getMetadata(storageKey) {
        const filePath = await this.getFilePath(storageKey);
        if (!filePath) return null;
        const stats = await fs.promises.stat(filePath);
        return {
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
        };
    }
}

module.exports = new FileStorageService();
