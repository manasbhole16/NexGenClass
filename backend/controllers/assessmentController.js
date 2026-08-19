const Assessment = require("../models/assessment-model");
const AssessmentSubmission = require("../models/assessment-submission-model");
const mongoose = require("mongoose");

/**
 * @desc    Create a new concept-tagged assessment with Bloom's Taxonomy metadata
 * @route   POST /api/assessments/create
 * @access  Faculty / Private
 */
const createAssessment = async (req, res) => {
    try {
        const { title, courseId, durationMinutes, questions } = req.body;

        // Validation
        if (!title || !courseId || !durationMinutes || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: title, courseId, durationMinutes, and a non-empty questions array."
            });
        }

        // Validate each question structure
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text || !q.topicTag || !q.bloomTaxonomy || !q.options || !Array.isArray(q.options) || q.options.length < 2 || q.correctOptionIndex === undefined) {
                return res.status(400).json({
                    success: false,
                    message: `Question #${i + 1} is invalid. Requires text, topicTag, valid bloomTaxonomy, at least 2 options, and correctOptionIndex.`
                });
            }
            if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
                return res.status(400).json({
                    success: false,
                    message: `Question #${i + 1} correctOptionIndex is out of bounds.`
                });
            }
        }

        const newAssessment = await Assessment.create({
            title,
            courseId,
            durationMinutes,
            questions,
            createdBy: req.user ? req.user._id : undefined
        });

        return res.status(201).json({
            success: true,
            message: "Assessment successfully created with concept tags and cognitive levels.",
            data: newAssessment
        });
    } catch (error) {
        console.error("Error creating assessment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create assessment.",
            error: error.message
        });
    }
};

/**
 * @desc    Submit student answers & ingest proctoring telemetry
 * @route   POST /api/assessments/:id/submit
 * @access  Student / Private
 */
const submitAssessment = async (req, res) => {
    try {
        const { id: assessmentId } = req.params;
        const { answers = [], telemetry = {}, studentId: customStudentId } = req.body;

        const resolvedStudentId = (req.user && req.user._id) ? req.user._id : customStudentId;

        if (!resolvedStudentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required (either via authentication session or payload studentId)."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid assessment ID format."
            });
        }

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found."
            });
        }

        // Map questions by questionId for fast evaluation
        const questionMap = new Map();
        let maxScore = 0;

        assessment.questions.forEach((q) => {
            const weight = q.weightage || 1;
            maxScore += weight;
            questionMap.set(q.questionId.toString(), {
                correctIndex: q.correctOptionIndex,
                weightage: weight,
                topicTag: q.topicTag,
                bloomTaxonomy: q.bloomTaxonomy
            });
        });

        let totalScore = 0;
        const processedAnswers = [];

        // Grade submitted answers
        answers.forEach((ans) => {
            const qMeta = questionMap.get(ans.questionId?.toString());
            let isCorrect = false;
            let marksObtained = 0;

            if (qMeta) {
                isCorrect = ans.selectedOption === qMeta.correctIndex;
                if (isCorrect) {
                    marksObtained = qMeta.weightage;
                    totalScore += marksObtained;
                }
            }

            processedAnswers.push({
                questionId: ans.questionId,
                selectedOption: ans.selectedOption,
                timeSpentSeconds: ans.timeSpentSeconds || 0,
                isCorrect,
                marksObtained
            });
        });

        const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0;

        // Ingest telemetry
        const telemetryPayload = {
            tabSwitchCount: Number(telemetry.tabSwitchCount) || 0,
            fullscreenExitCount: Number(telemetry.fullscreenExitCount) || 0,
            blurDurationSeconds: Number(telemetry.blurDurationSeconds) || 0,
            submissionTimestamp: telemetry.submissionTimestamp || new Date()
        };

        const submission = await AssessmentSubmission.create({
            assessmentId: assessment._id,
            studentId: resolvedStudentId,
            answers: processedAnswers,
            totalScore,
            maxScore,
            percentage,
            telemetry: telemetryPayload
        });

        return res.status(201).json({
            success: true,
            message: "Assessment submitted successfully. Telemetry ingested.",
            data: {
                submissionId: submission._id,
                totalScore,
                maxScore,
                percentage,
                telemetry: submission.telemetry,
                createdAt: submission.createdAt
            }
        });
    } catch (error) {
        console.error("Error submitting assessment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process assessment submission.",
            error: error.message
        });
    }
};

/**
 * @desc    Get assessment by ID
 * @route   GET /api/assessments/:id
 * @access  Public / Private
 */
const getAssessmentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const assessment = await Assessment.findById(id);
        if (!assessment) {
            return res.status(404).json({ success: false, message: "Assessment not found" });
        }

        // Strip correct answers if requested by student
        const sanitizedQuestions = assessment.questions.map(q => ({
            questionId: q.questionId,
            text: q.text,
            topicTag: q.topicTag,
            bloomTaxonomy: q.bloomTaxonomy,
            options: q.options,
            weightage: q.weightage
        }));

        res.status(200).json({
            success: true,
            data: {
                ...assessment.toObject(),
                questions: sanitizedQuestions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createAssessment,
    submitAssessment,
    getAssessmentById
};
