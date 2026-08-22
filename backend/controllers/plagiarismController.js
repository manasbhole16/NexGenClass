const mongoose = require("mongoose");
const PlagiarismReport = require("../models/plagiarismReport-model");
const Submission = require("../models/submission-model");
const Task = require("../models/task-model");
const Room = require("../models/room-model");
const File = require("../models/file-model");
const User = require("../models/user-model");
const plagiarismService = require("../services/plagiarismService");
const { extractTextFromFile } = require("../services/documentExtractionService");
const notificationService = require("../services/notificationService");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Helper to extract textual content from submission (content field + attachments)
 */
async function extractSubmissionText(submission) {
    let combinedText = submission.content || "";

    if (Array.isArray(submission.attachments) && submission.attachments.length > 0) {
        for (const att of submission.attachments) {
            if (att.fileId) {
                const fileDoc = await File.findById(att.fileId);
                if (fileDoc) {
                    const extracted = await extractTextFromFile(fileDoc);
                    if (extracted.supported && extracted.text) {
                        combinedText += `\n\n[Attachment: ${att.fileName}]\n` + extracted.text;
                    }
                }
            }
        }
    }

    return combinedText.trim();
}

/**
 * Verify Teacher Access for Task
 */
async function verifyTeacherTaskAccess(taskId, userId) {
    if (!isValidId(taskId)) return null;
    const task = await Task.findById(taskId);
    if (!task) return null;

    if (task.room) {
        const room = await Room.findById(task.room);
        if (!room) return null;
        const isOwner = room.owner && room.owner.toString() === userId.toString();
        const isMember = room.members && room.members.some(m => m.toString() === userId.toString());
        return { task, room, isOwner, isMember, authorized: isOwner || task.owner?.toString() === userId.toString() };
    }

    return { task, room: null, isOwner: task.owner?.toString() === userId.toString(), authorized: task.owner?.toString() === userId.toString() };
}

// 1. Analyze single submission
exports.analyzeSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        if (!isValidId(submissionId)) {
            return res.status(400).json({ message: "Invalid submission ID" });
        }

        const submission = await Submission.findById(submissionId).populate("studentId", "fullname email");
        if (!submission) return res.status(404).json({ message: "Submission not found" });

        const taskAccess = await verifyTeacherTaskAccess(submission.taskId, req.user._id);
        if (!taskAccess || !taskAccess.authorized) {
            return res.status(403).json({ message: "Unauthorized to analyze this submission" });
        }

        const targetText = await extractSubmissionText(submission);

        // Fetch eligible peer submissions for the same Task
        const peerSubmissions = await Submission.find({
            taskId: submission.taskId,
            _id: { $ne: submission._id },
            status: { $in: ["submitted", "graded", "late"] }
        }).populate("studentId", "fullname");

        const peerPayloads = [];
        for (const peer of peerSubmissions) {
            const pText = await extractSubmissionText(peer);
            if (pText) {
                peerPayloads.push({
                    submissionId: peer._id,
                    studentId: peer.studentId?._id,
                    studentName: peer.studentId?.fullname || "Peer Student",
                    text: pText
                });
            }
        }

        const analysis = plagiarismService.analyzeSubmissionText(
            {
                submissionId: submission._id,
                studentId: submission.studentId?._id,
                text: targetText
            },
            peerPayloads
        );

        const report = await PlagiarismReport.findOneAndUpdate(
            { submissionId: submission._id },
            {
                taskId: submission.taskId,
                roomId: submission.roomId,
                studentId: submission.studentId?._id,
                status: "completed",
                analyzedAt: new Date(),
                overallSimilarityPercent: analysis.overallSimilarityPercent,
                exactMatchPercent: analysis.exactMatchPercent,
                phraseMatchPercent: analysis.phraseMatchPercent,
                tokenSimilarityPercent: analysis.tokenSimilarityPercent,
                confidence: analysis.confidence,
                category: analysis.category,
                matchedSubmissions: analysis.matchedSubmissions,
                matchedSegments: analysis.matchedSegments,
                analyzedWordCount: analysis.analyzedWordCount,
                sourceType: "text"
            },
            { new: true, upsert: true }
        ).populate("studentId", "fullname email");

        return res.json({ success: true, report });
    } catch (err) {
        console.error("analyzeSubmission error:", err);
        return res.status(500).json({ message: "Failed to analyze submission", error: err.message });
    }
};

// 2. Get plagiarism report for a submission
exports.getSubmissionReport = async (req, res) => {
    try {
        const { submissionId } = req.params;
        if (!isValidId(submissionId)) return res.status(400).json({ message: "Invalid submission ID" });

        const submission = await Submission.findById(submissionId);
        if (!submission) return res.status(404).json({ message: "Submission not found" });

        const taskAccess = await verifyTeacherTaskAccess(submission.taskId, req.user._id);
        const isStudentOwner = submission.studentId.toString() === req.user._id.toString();

        // RBAC: Only submission owner or classroom instructor
        if (!isStudentOwner && (!taskAccess || !taskAccess.authorized)) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this plagiarism report." });
        }

        let report = await PlagiarismReport.findOne({ submissionId })
            .populate("studentId", "fullname email")
            .populate("reviewedBy", "fullname");

        if (!report) {
            return res.json({
                success: true,
                report: null,
                message: "No plagiarism analysis generated yet for this submission."
            });
        }

        // Privacy: If student is querying, do not leak full identities of peer matched students
        if (isStudentOwner && (!taskAccess || !taskAccess.authorized)) {
            const sanitizedMatches = (report.matchedSubmissions || []).map(m => ({
                similarityPercent: m.similarityPercent,
                studentName: "Classroom Peer"
            }));
            const sanitizedSegments = (report.matchedSegments || []).map(s => ({
                text: s.text,
                sourceStudentName: "Classroom Peer",
                length: s.length,
                similarityScore: s.similarityScore
            }));

            return res.json({
                success: true,
                isStudent: true,
                report: {
                    _id: report._id,
                    overallSimilarityPercent: report.overallSimilarityPercent,
                    exactMatchPercent: report.exactMatchPercent,
                    phraseMatchPercent: report.phraseMatchPercent,
                    category: report.category,
                    confidence: report.confidence,
                    analyzedAt: report.analyzedAt,
                    analyzedWordCount: report.analyzedWordCount,
                    matchedSubmissions: sanitizedMatches,
                    matchedSegments: sanitizedSegments
                }
            });
        }

        return res.json({ success: true, isTeacher: true, report });
    } catch (err) {
        return res.status(500).json({ message: "Failed to get plagiarism report", error: err.message });
    }
};

// 3. Get Task-wide plagiarism overview
exports.getTaskPlagiarismOverview = async (req, res) => {
    try {
        const { taskId } = req.params;
        const taskAccess = await verifyTeacherTaskAccess(taskId, req.user._id);
        if (!taskAccess || !taskAccess.authorized) {
            return res.status(403).json({ message: "Forbidden: Only instructors can view task plagiarism reports." });
        }

        const totalSubmissions = await Submission.countDocuments({
            taskId,
            status: { $in: ["submitted", "graded", "late"] }
        });

        const reports = await PlagiarismReport.find({ taskId })
            .populate("studentId", "fullname email")
            .sort({ overallSimilarityPercent: -1 });

        const summary = {
            totalSubmissions,
            analyzedCount: reports.length,
            lowCount: reports.filter(r => r.category === "low").length,
            moderateCount: reports.filter(r => r.category === "moderate").length,
            highCount: reports.filter(r => r.category === "high").length,
            veryHighCount: reports.filter(r => r.category === "very_high").length,
            reviewedCount: reports.filter(r => r.isReviewed).length,
            averageSimilarity: reports.length > 0
                ? Math.round(reports.reduce((acc, r) => acc + r.overallSimilarityPercent, 0) / reports.length)
                : 0
        };

        return res.json({ success: true, summary, reports });
    } catch (err) {
        return res.status(500).json({ message: "Failed to get overview", error: err.message });
    }
};

// 4. Batch analyze all submissions for a Task
exports.analyzeTaskSubmissions = async (req, res) => {
    try {
        const { taskId } = req.params;
        const taskAccess = await verifyTeacherTaskAccess(taskId, req.user._id);
        if (!taskAccess || !taskAccess.authorized) {
            return res.status(403).json({ message: "Forbidden: Only instructors can run batch originality analysis." });
        }

        const submissions = await Submission.find({
            taskId,
            status: { $in: ["submitted", "graded", "late"] }
        }).populate("studentId", "fullname email");

        if (submissions.length === 0) {
            return res.json({ success: true, message: "No eligible submissions to analyze.", analyzedCount: 0 });
        }

        // Extract all texts once
        const extractedMap = new Map();
        for (const sub of submissions) {
            const text = await extractSubmissionText(sub);
            extractedMap.set(sub._id.toString(), {
                submissionId: sub._id,
                studentId: sub.studentId?._id,
                studentName: sub.studentId?.fullname || "Student",
                text
            });
        }

        const reports = [];
        for (const sub of submissions) {
            const current = extractedMap.get(sub._id.toString());
            const peers = Array.from(extractedMap.values()).filter(p => p.submissionId.toString() !== sub._id.toString());

            const analysis = plagiarismService.analyzeSubmissionText(current, peers);

            const report = await PlagiarismReport.findOneAndUpdate(
                { submissionId: sub._id },
                {
                    taskId: sub.taskId,
                    roomId: sub.roomId,
                    studentId: sub.studentId?._id,
                    status: "completed",
                    analyzedAt: new Date(),
                    overallSimilarityPercent: analysis.overallSimilarityPercent,
                    exactMatchPercent: analysis.exactMatchPercent,
                    phraseMatchPercent: analysis.phraseMatchPercent,
                    tokenSimilarityPercent: analysis.tokenSimilarityPercent,
                    confidence: analysis.confidence,
                    category: analysis.category,
                    matchedSubmissions: analysis.matchedSubmissions,
                    matchedSegments: analysis.matchedSegments,
                    analyzedWordCount: analysis.analyzedWordCount,
                    sourceType: "text"
                },
                { new: true, upsert: true }
            );
            reports.push(report);
        }

        if (req.io && taskAccess.task.room) {
            req.io.to(taskAccess.task.room.toString()).emit("plagiarism:completed", {
                taskId,
                analyzedCount: reports.length
            });
        }

        return res.json({ success: true, message: "Batch analysis completed successfully", analyzedCount: reports.length, reports });
    } catch (err) {
        return res.status(500).json({ message: "Failed to run batch analysis", error: err.message });
    }
};

// 5. Mark report as reviewed
exports.reviewReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { reviewNotes = "" } = req.body;

        const report = await PlagiarismReport.findById(reportId);
        if (!report) return res.status(404).json({ message: "Report not found" });

        const taskAccess = await verifyTeacherTaskAccess(report.taskId, req.user._id);
        if (!taskAccess || !taskAccess.authorized) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        report.isReviewed = true;
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        report.reviewNotes = String(reviewNotes).trim();
        await report.save();

        return res.json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ message: "Failed to review report", error: err.message });
    }
};

// 6. Export Task Plagiarism CSV Report (with formula injection defense)
exports.exportTaskCSV = async (req, res) => {
    try {
        const { taskId } = req.params;
        const taskAccess = await verifyTeacherTaskAccess(taskId, req.user._id);
        if (!taskAccess || !taskAccess.authorized) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const reports = await PlagiarismReport.find({ taskId }).populate("studentId", "fullname email");

        // Formula injection defense sanitizer
        const sanitizeCsv = (val) => {
            if (val === null || val === undefined) return "";
            let s = String(val).trim();
            if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@")) {
                s = "'" + s;
            }
            return `"${s.replace(/"/g, '""')}"`;
        };

        const headers = ["Student Name", "Email", "Overall Similarity %", "Category", "Exact Match %", "Matched Sources Count", "Word Count", "Reviewed", "Analyzed At"];
        const rows = reports.map(r => [
            sanitizeCsv(r.studentId?.fullname || "Unknown"),
            sanitizeCsv(r.studentId?.email || "Unknown"),
            sanitizeCsv(r.overallSimilarityPercent),
            sanitizeCsv(r.category),
            sanitizeCsv(r.exactMatchPercent),
            sanitizeCsv((r.matchedSubmissions || []).length),
            sanitizeCsv(r.analyzedWordCount),
            sanitizeCsv(r.isReviewed ? "Yes" : "No"),
            sanitizeCsv(r.analyzedAt ? new Date(r.analyzedAt).toISOString() : "")
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=Plagiarism_Report_${taskId}.csv`);
        return res.status(200).send(csvContent);
    } catch (err) {
        return res.status(500).json({ message: "Failed to export CSV", error: err.message });
    }
};
