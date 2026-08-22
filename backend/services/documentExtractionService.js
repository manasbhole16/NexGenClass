const fs = require("fs");
const path = require("path");
const fileStorageService = require("./fileStorageService");

const MAX_CHARS_PER_DOC = parseInt(process.env.AI_MAX_CONTEXT_CHARS, 10) || 30000;
const extractionCache = new Map(); // storageKey -> { text, extractedAt }

/**
 * Extract plain text content from a file
 */
async function extractTextFromFile(fileDoc) {
    if (!fileDoc) {
        return { supported: false, reason: "No file document provided", text: "" };
    }

    if (fileDoc.isExternalLink) {
        return {
            supported: true,
            text: `[External Resource: ${fileDoc.originalName}]\nURL: ${fileDoc.externalUrl}\nDescription: ${fileDoc.description || "No description provided."}`,
            title: fileDoc.originalName
        };
    }

    const storageKey = fileDoc.storageKey;
    if (!storageKey) {
        return { supported: false, reason: "Missing storage key", text: "" };
    }

    // Check in-memory extraction cache
    if (extractionCache.has(storageKey)) {
        return extractionCache.get(storageKey);
    }

    const filePath = await fileStorageService.getFilePath(storageKey);
    if (!filePath || !fs.existsSync(filePath)) {
        return { supported: false, reason: "Physical file not found on server", text: "" };
    }

    const ext = (fileDoc.extension || path.extname(filePath)).toLowerCase();
    const mime = (fileDoc.mimeType || "").toLowerCase();

    let extractedText = "";
    let supported = true;

    try {
        // Plain text, Code, Markdown, JSON, CSV
        if (
            [".txt", ".md", ".json", ".csv", ".tsv", ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".html", ".css", ".xml", ".sql", ".yaml", ".yml"].includes(ext) ||
            mime.startsWith("text/") || mime.includes("json") || mime.includes("javascript")
        ) {
            const raw = await fs.promises.readFile(filePath, "utf-8");
            extractedText = raw;
        } else if (ext === ".pdf" || mime === "application/pdf") {
            // PDF Text extractor: Read buffer and extract text streams
            const buffer = await fs.promises.readFile(filePath);
            const str = buffer.toString("latin1");
            
            // Extract textual chunks from uncompressed PDF streams
            const matches = [];
            const streamRegex = /BT[\s\S]*?ET/g;
            let match;
            while ((match = streamRegex.exec(str)) !== null) {
                const textSnippets = match[0].match(/\((.*?)\)|\[(.*?)\]/g);
                if (textSnippets) {
                    matches.push(textSnippets.join(" ").replace(/[\(\)\[\]]/g, ""));
                }
            }

            if (matches.length > 0) {
                extractedText = matches.join("\n");
            } else {
                // Fallback to printable ascii extraction from PDF
                const printable = str.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
                extractedText = printable.length > 100 ? printable : `[PDF Document: ${fileDoc.originalName}]`;
            }
        } else {
            supported = false;
            return {
                supported: false,
                reason: `Visual / Binary format (${ext}) is not directly text-extractable.`,
                text: `[Document: ${fileDoc.originalName} (${fileDoc.category || 'File'})]`,
                title: fileDoc.originalName
            };
        }

        // Clean & truncate text if exceeds limit
        let cleaned = extractedText.replace(/\r\n/g, "\n").trim();
        if (cleaned.length > MAX_CHARS_PER_DOC) {
            cleaned = cleaned.substring(0, MAX_CHARS_PER_DOC) + "\n\n[... Document truncated for AI context limits ...]";
        }

        const result = {
            supported,
            text: cleaned || `[Document: ${fileDoc.originalName}]`,
            title: fileDoc.originalName,
            category: fileDoc.category,
            size: fileDoc.size,
            extractedAt: Date.now()
        };

        // Cache result (capped at 100 items)
        if (extractionCache.size > 100) {
            const firstKey = extractionCache.keys().next().value;
            extractionCache.delete(firstKey);
        }
        extractionCache.set(storageKey, result);

        return result;
    } catch (err) {
        console.error("Document extraction error:", err);
        return {
            supported: false,
            reason: `Extraction failed: ${err.message}`,
            text: "",
            title: fileDoc.originalName
        };
    }
}

module.exports = {
    extractTextFromFile
};
