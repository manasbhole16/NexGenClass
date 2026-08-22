const path = require("path");

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Block dangerous executable and server script extensions
const DANGEROUS_EXTENSIONS = new Set([
    ".exe", ".bat", ".cmd", ".sh", ".bash", ".vbs", ".msi", ".dll", 
    ".scr", ".pif", ".application", ".gadget", ".php", ".php3", ".php4", 
    ".php5", ".phtml", ".asp", ".aspx", ".cgi", ".pl", ".jsp", ".jspx"
]);

/**
 * Infer human-readable category from MIME type and file extension
 */
function inferCategory(mimeType = "", extension = "") {
    const ext = (extension || "").toLowerCase();
    const mime = (mimeType || "").toLowerCase();

    if (mime === "application/pdf" || ext === ".pdf") return "pdf";

    if (
        mime.startsWith("image/") || 
        [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"].includes(ext)
    ) {
        return "image";
    }

    if (
        mime.startsWith("video/") || 
        [".mp4", ".webm", ".mkv", ".mov", ".avi", ".wmv"].includes(ext)
    ) {
        return "video";
    }

    if (
        mime.includes("spreadsheet") || 
        mime.includes("excel") || 
        [".xlsx", ".xls", ".csv", ".tsv", ".ods"].includes(ext)
    ) {
        return "spreadsheet";
    }

    if (
        mime.includes("presentation") || 
        mime.includes("powerpoint") || 
        [".pptx", ".ppt", ".odp", ".key"].includes(ext)
    ) {
        return "presentation";
    }

    if (
        [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"].includes(ext) ||
        mime.includes("zip") || mime.includes("compressed") || mime.includes("archive")
    ) {
        return "archive";
    }

    if (
        [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".html", ".css", ".json", ".xml", ".sql", ".sh", ".yaml", ".yml", ".md"].includes(ext) ||
        mime.includes("javascript") || mime.includes("json") || mime.includes("xml") || mime.startsWith("text/x-")
    ) {
        return "code";
    }

    if (
        mime.includes("word") || 
        mime.includes("document") || 
        mime.startsWith("text/") || 
        [".doc", ".docx", ".txt", ".rtf", ".odt"].includes(ext)
    ) {
        return "document";
    }

    return "other";
}

/**
 * Sanitize filename to prevent directory traversal and special character exploits
 */
function sanitizeFilename(originalName = "unnamed_file") {
    if (!originalName || typeof originalName !== "string") {
        originalName = "unnamed_file";
    }

    // Strip path components
    let base = path.basename(originalName);

    // Remove null bytes and control chars
    base = base.replace(/[\x00-\x1f\x80-\x9f]/g, "");

    // Replace dangerous filesystem characters
    base = base.replace(/[/\\?%*:|"<>]/g, "_").trim();

    // Prevent hidden files or leading dots
    while (base.startsWith(".")) {
        base = base.substring(1);
    }

    if (!base) {
        base = "file_" + Date.now();
    }

    // Limit length to 200 characters while preserving extension
    const ext = path.extname(base);
    const nameWithoutExt = path.basename(base, ext);
    const truncatedName = nameWithoutExt.substring(0, 180);

    return truncatedName + ext;
}

/**
 * Validate upload file parameters
 */
function validateFile({ originalname, size, mimetype }) {
    if (!originalname) {
        return { valid: false, error: "Filename is required" };
    }

    const sanitized = sanitizeFilename(originalname);
    const ext = path.extname(sanitized).toLowerCase();

    if (DANGEROUS_EXTENSIONS.has(ext)) {
        return { valid: false, error: `File type "${ext}" is forbidden for security reasons.` };
    }

    if (size && size > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.` };
    }

    return { valid: true, sanitizedName: sanitized, extension: ext };
}

module.exports = {
    MAX_FILE_SIZE_MB,
    MAX_FILE_SIZE_BYTES,
    inferCategory,
    sanitizeFilename,
    validateFile
};
