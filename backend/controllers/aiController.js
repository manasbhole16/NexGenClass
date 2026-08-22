const aiService = require("../services/aiService");
const aiContextService = require("../services/aiContextService");
const AIConversation = require("../models/aiConversation-model");
const Room = require("../models/room-model");
const Task = require("../models/task-model");
const Submission = require("../models/submission-model");
const Attendance = require("../models/attendance-model");
const Attempt = require("../models/attempt-model");
const mongoose = require("mongoose");

// Rate limiting in-memory store: userId -> [timestamp1, timestamp2, ...]
const userRequestTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 10) || 60000;
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 10) || 30;

function checkRateLimit(userId) {
    const now = Date.now();
    const timestamps = userRequestTimestamps.get(userId.toString()) || [];
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }
    recent.push(now);
    userRequestTimestamps.set(userId.toString(), recent);
    return true;
}

/**
 * 1. Document Summarization
 * POST /api/ai/summarize
 * Body: { fileId, summaryType }
 */
exports.summarizeDocument = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment before sending more AI requests." });
        }

        const { fileId, summaryType = "standard" } = req.body;
        if (!fileId) {
            return res.status(400).json({ message: "fileId is required" });
        }

        const context = await aiContextService.getFileContext(fileId, req.user);
        if (context.error) {
            const status = context.error.includes("Forbidden") ? 403 : 404;
            return res.status(status).json({ message: context.error });
        }

        if (!context.text) {
            return res.status(400).json({ message: "Could not extract text content from the specified document." });
        }

        const summaryResult = await aiService.summarizeDocument({
            text: context.text,
            summaryType,
            title: context.title
        });

        return res.status(200).json({
            success: true,
            fileId,
            title: context.title,
            summaryType,
            ...summaryResult
        });
    } catch (err) {
        console.error("AI Summarize error:", err);
        return res.status(500).json({ message: "Failed to summarize document", error: err.message });
    }
};

/**
 * 2. Document Q&A with Strict Academic Citations
 * POST /api/ai/ask
 * Body: { fileId, question, conversationId }
 */
exports.askDocumentQuestion = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment before sending more AI requests." });
        }

        const { fileId, question, conversationId } = req.body;
        if (!question || !question.trim()) {
            return res.status(400).json({ message: "Question cannot be empty" });
        }

        let documentText = "";
        let documentTitle = "Classroom Context";
        let contextFile = null;

        if (fileId) {
            const context = await aiContextService.getFileContext(fileId, req.user);
            if (context.error) {
                const status = context.error.includes("Forbidden") ? 403 : 404;
                return res.status(status).json({ message: context.error });
            }
            documentText = context.text;
            documentTitle = context.title;
            contextFile = context.file;
        }

        const aiResponse = await aiService.answerDocumentQuestion({
            documentText,
            question: question.trim(),
            documentTitle
        });

        // Optionally append to conversation if conversationId is provided
        if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
            const conv = await AIConversation.findOne({ _id: conversationId, userId: req.user._id, deletedAt: null });
            if (conv) {
                conv.messages.push({ role: "user", content: question.trim() });
                conv.messages.push({
                    role: "assistant",
                    content: aiResponse.answer,
                    sources: aiResponse.sources.map(s => ({
                        title: s.title,
                        section: s.section,
                        fileId: contextFile?._id || null
                    }))
                });
                await conv.save();
            }
        }

        return res.status(200).json({
            success: true,
            question,
            answer: aiResponse.answer,
            sources: aiResponse.sources,
            hasDirectSource: aiResponse.hasDirectSource
        });
    } catch (err) {
        console.error("AI Ask error:", err);
        return res.status(500).json({ message: "Failed to answer question", error: err.message });
    }
};

/**
 * 3. Generate Study Guide
 * POST /api/ai/study-guide
 * Body: { topic, fileId, roomId, difficulty, examDate }
 */
exports.generateStudyGuide = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment." });
        }

        const { topic = "General Study", fileId, roomId, difficulty = "medium", examDate } = req.body;

        let contextText = "";
        if (fileId) {
            const fileCtx = await aiContextService.getFileContext(fileId, req.user);
            if (!fileCtx.error) contextText = fileCtx.text;
        } else if (roomId) {
            const roomCtx = await aiContextService.getClassroomContext(roomId, req.user);
            if (!roomCtx.error) contextText = roomCtx.combinedText;
        }

        const guide = await aiService.generateStudyGuide({
            topic,
            contextText,
            difficulty,
            examDate
        });

        return res.status(200).json({
            success: true,
            guide
        });
    } catch (err) {
        console.error("Study Guide error:", err);
        return res.status(500).json({ message: "Failed to generate study guide", error: err.message });
    }
};

/**
 * 4. Generate Quiz Questions (Teacher Only)
 * POST /api/ai/generate-questions
 * Body: { topic, fileIds, questionTypes, count, difficulty, marks, roomId }
 */
exports.generateQuizQuestions = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded." });
        }

        // Must be a teacher
        if (req.user.role !== "teacher") {
            return res.status(403).json({ message: "Forbidden: Only instructors can generate quiz questions" });
        }

        const { topic = "General", fileIds = [], questionTypes = ["mcq"], count = 3, difficulty = "medium", marks = 2, roomId } = req.body;

        let combinedContext = "";
        if (Array.isArray(fileIds) && fileIds.length > 0) {
            for (const fid of fileIds) {
                const ctx = await aiContextService.getFileContext(fid, req.user);
                if (!ctx.error && ctx.text) {
                    combinedContext += `\n${ctx.text.slice(0, 5000)}`;
                }
            }
        }

        const questions = await aiService.generateQuizQuestions({
            topic,
            contextText: combinedContext,
            questionTypes,
            count: Math.min(Math.max(Number(count) || 3, 1), 10),
            difficulty,
            marks: Number(marks) || 2
        });

        return res.status(200).json({
            success: true,
            count: questions.length,
            questions
        });
    } catch (err) {
        console.error("AI Generate Questions error:", err);
        return res.status(500).json({ message: "Failed to generate quiz questions", error: err.message });
    }
};

/**
 * 5. Generate Rubric (Teacher Only)
 * POST /api/ai/generate-rubric
 * Body: { assignmentTitle, instructions, maxMarks, fileIds }
 */
exports.generateRubric = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded." });
        }

        if (req.user.role !== "teacher") {
            return res.status(403).json({ message: "Forbidden: Only instructors can generate assignment rubrics" });
        }

        const { assignmentTitle = "Assignment", instructions = "", maxMarks = 100, fileIds = [] } = req.body;

        let combinedContext = "";
        if (Array.isArray(fileIds) && fileIds.length > 0) {
            for (const fid of fileIds) {
                const ctx = await aiContextService.getFileContext(fid, req.user);
                if (!ctx.error && ctx.text) {
                    combinedContext += `\n${ctx.text.slice(0, 3000)}`;
                }
            }
        }

        const rubric = await aiService.generateRubric({
            assignmentTitle,
            instructions,
            maxMarks: Number(maxMarks) || 100,
            contextText: combinedContext
        });

        return res.status(200).json({
            success: true,
            rubric
        });
    } catch (err) {
        console.error("AI Rubric error:", err);
        return res.status(500).json({ message: "Failed to generate rubric", error: err.message });
    }
};

/**
 * 6. Generate Assignment / Task Draft (Teacher Only)
 * POST /api/ai/generate-task-draft
 * Body: { prompt, timezone }
 */
exports.generateTaskDraft = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded." });
        }

        if (req.user.role !== "teacher") {
            return res.status(403).json({ message: "Forbidden: Only instructors can draft assignments" });
        }

        const { prompt, timezone = "UTC" } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ message: "Prompt cannot be empty" });
        }

        const { generateTaskDraftFromPrompt } = require("../services/aiGeneration");
        let draft;
        try {
            draft = await generateTaskDraftFromPrompt({ prompt, timezone });
        } catch (e) {
            // Local fallback
            draft = {
                title: `Assignment: ${prompt.slice(0, 40)}`,
                description: `Complete the assigned coursework on: ${prompt}. Review lecture notes and submit your deliverable.`,
                tags: ["Coursework", "Academic"],
                dueDateSuggestion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                subtasks: [{ title: "Review instructions" }, { title: "Implement solution" }, { title: "Submit deliverable" }],
                rubric: [
                    { criterion: "Correctness", points: 50, description: "Meets all functional specifications." },
                    { criterion: "Code & Structure", points: 30, description: "Clean engineering structure." },
                    { criterion: "Documentation", points: 20, description: "Clear explanations." }
                ]
            };
        }

        return res.status(200).json({
            success: true,
            draft
        });
    } catch (err) {
        console.error("Task draft error:", err);
        return res.status(500).json({ message: "Failed to generate task draft", error: err.message });
    }
};

/**
 * 7. Generate Personalized Study Plan
 * POST /api/ai/study-plan
 * Body: { roomId, weakAreas }
 */
exports.generateStudyPlan = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded." });
        }

        const { roomId, weakAreas = [] } = req.body;

        // Fetch student's real context
        const academicCtx = await aiContextService.getStudentAcademicContext(req.user, roomId);

        // Fetch basic attendance
        let attendancePct = 100;
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            const records = await Attendance.find({ room: roomId, "records.student": req.user._id });
            if (records.length > 0) {
                let present = 0;
                records.forEach(r => {
                    const st = r.records.find(rec => rec.student.toString() === req.user._id.toString());
                    if (st && (st.status === "Present" || st.status === "Late")) present++;
                });
                attendancePct = Math.round((present / records.length) * 100);
            }
        }

        const plan = await aiService.generateStudyPlan({
            studentName: req.user.fullname,
            analytics: {
                attendancePercentage: attendancePct,
                overdueCount: academicCtx.upcomingTasks.length
            },
            plannerEvents: academicCtx.upcomingTasks,
            weakAreas
        });

        return res.status(200).json({
            success: true,
            plan
        });
    } catch (err) {
        console.error("Study Plan error:", err);
        return res.status(500).json({ message: "Failed to generate study plan", error: err.message });
    }
};

/**
 * 8. Performance Insights
 * POST /api/ai/performance-insights
 * Body: { roomId }
 */
exports.getPerformanceInsights = async (req, res) => {
    try {
        const { roomId } = req.body;
        let attendancePercentage = 100;
        let missingCount = 0;

        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            const att = await Attendance.find({ room: roomId, "records.student": req.user._id });
            if (att.length > 0) {
                let p = 0;
                att.forEach(r => {
                    const st = r.records.find(rec => rec.student.toString() === req.user._id.toString());
                    if (st && st.status === "Present") p++;
                });
                attendancePercentage = Math.round((p / att.length) * 100);
            }

            const unsubmitted = await Task.countDocuments({
                room: roomId,
                isDraft: false,
                dueDate: { $lt: new Date() }
            });
            missingCount = unsubmitted;
        }

        const insights = await aiService.analyzeStudentPerformance({
            studentName: req.user.fullname,
            attendancePercentage,
            assignmentAverage: 80,
            quizAverage: 85,
            missingCount
        });

        return res.status(200).json({
            success: true,
            insights
        });
    } catch (err) {
        console.error("Performance insights error:", err);
        return res.status(500).json({ message: "Failed to get insights", error: err.message });
    }
};

/**
 * 9. AI Conversations CRUD
 */
exports.createConversation = async (req, res) => {
    try {
        const { title = "Academic Study Session", roomId, mode = "study_assistant", contextFileIds = [] } = req.body;

        const conv = new AIConversation({
            userId: req.user._id,
            roomId: roomId && mongoose.Types.ObjectId.isValid(roomId) ? roomId : null,
            title,
            mode,
            contextFileIds,
            messages: [
                {
                    role: "assistant",
                    content: `Hello ${req.user.fullname}! I am your NexGenClass ${req.user.role === 'teacher' ? 'Teaching Copilot' : 'AI Study Assistant'}. How can I assist your academic workflow today?`
                }
            ]
        });

        await conv.save();
        return res.status(201).json({ success: true, conversation: conv });
    } catch (err) {
        return res.status(500).json({ message: "Failed to create conversation", error: err.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const { roomId } = req.query;
        const query = { userId: req.user._id, deletedAt: null };
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            query.roomId = roomId;
        }

        const conversations = await AIConversation.find(query)
            .sort({ updatedAt: -1 })
            .select("title mode roomId contextFileIds createdAt updatedAt messages")
            .limit(20);

        return res.status(200).json({ success: true, conversations });
    } catch (err) {
        return res.status(500).json({ message: "Failed to list conversations", error: err.message });
    }
};

exports.getConversationById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        const conv = await AIConversation.findOne({ _id: id, userId: req.user._id, deletedAt: null })
            .populate("contextFileIds", "originalName mimeType size category");

        if (!conv) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        return res.status(200).json({ success: true, conversation: conv });
    } catch (err) {
        return res.status(500).json({ message: "Failed to get conversation", error: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        if (!checkRateLimit(req.user._id)) {
            return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment." });
        }

        const { id } = req.params;
        const { message, fileId } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message content cannot be empty" });
        }

        const conv = await AIConversation.findOne({ _id: id, userId: req.user._id, deletedAt: null });
        if (!conv) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Add user message
        conv.messages.push({ role: "user", content: message.trim() });

        // Retrieve document context if file is linked
        let docText = "";
        let docTitle = "Classroom Context";
        const targetFileId = fileId || (conv.contextFileIds && conv.contextFileIds[0]);

        if (targetFileId) {
            const ctx = await aiContextService.getFileContext(targetFileId, req.user);
            if (!ctx.error) {
                docText = ctx.text;
                docTitle = ctx.title;
            }
        }

        // Generate response
        const aiResponse = await aiService.answerDocumentQuestion({
            documentText: docText,
            question: message.trim(),
            documentTitle: docTitle,
            history: conv.messages
        });

        // Add assistant reply
        conv.messages.push({
            role: "assistant",
            content: aiResponse.answer,
            sources: aiResponse.sources.map(s => ({
                title: s.title,
                section: s.section,
                fileId: targetFileId || null
            }))
        });

        await conv.save();

        return res.status(200).json({
            success: true,
            message: conv.messages[conv.messages.length - 1],
            conversation: conv
        });
    } catch (err) {
        return res.status(500).json({ message: "Failed to send message", error: err.message });
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        const conv = await AIConversation.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!conv) {
            return res.status(404).json({ message: "Conversation not found or unauthorized" });
        }

        return res.status(200).json({ success: true, message: "Conversation deleted" });
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete conversation", error: err.message });
    }
};

exports.getAIHealth = async (req, res) => {
    return res.status(200).json({
        status: "ok",
        provider: aiService.provider,
        isConfigured: aiService.isProviderAvailable(),
        maxTokens: 1800,
        rateLimit: {
            windowMs: RATE_LIMIT_WINDOW_MS,
            maxRequests: RATE_LIMIT_MAX_REQUESTS
        }
    });
};
