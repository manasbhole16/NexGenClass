const Quiz = require('../models/quiz-model');
const Question = require('../models/question-model');
const Attempt = require('../models/attempt-model');
const Room = require('../models/room-model');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');
const { isAiConfigured } = require("../utils/aiClient");
const { generateQuizQuestionsFromNotes } = require("../services/aiGeneration");

// Helper to check if user is teacher or classroom owner
async function isAuthorizedTeacher(user, roomId, createdBy = null) {
    if (!user) return false;
    if (user.role !== 'teacher') return false;
    if (createdBy && createdBy.toString() === user._id.toString()) return true;
    if (roomId) {
        const room = await Room.findById(roomId);
        if (room && (room.owner?.toString() === user._id.toString() || room.members?.some(m => m.toString() === user._id.toString()))) {
            return true;
        }
        return false;
    }
    return false;
}

// Helper to validate question payload
function validateQuestion(q, idx) {
    const qNum = idx + 1;
    if (!q.questionText || !q.questionText.trim()) {
        throw new Error(`Question #${qNum}: Question text is required.`);
    }
    const marks = Number(q.marks);
    if (isNaN(marks) || marks <= 0) {
        throw new Error(`Question #${qNum}: Marks must be greater than 0.`);
    }

    if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(`Question #${qNum}: MCQ requires at least 2 options.`);
        }
        if (q.options.some(opt => !opt.text || !opt.text.trim())) {
            throw new Error(`Question #${qNum}: MCQ options cannot be empty.`);
        }
        const correctIdx = Number(q.correctAnswer);
        if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= q.options.length) {
            throw new Error(`Question #${qNum}: Valid single correct option must be selected.`);
        }
    } else if (q.type === 'multiple_select') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(`Question #${qNum}: Multiple Select requires at least 2 options.`);
        }
        if (q.options.some(opt => !opt.text || !opt.text.trim())) {
            throw new Error(`Question #${qNum}: Multiple Select options cannot be empty.`);
        }
        if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
            throw new Error(`Question #${qNum}: Multiple Select requires at least one correct option.`);
        }
        if (q.correctAnswer.some(c => typeof c !== 'number' || c < 0 || c >= q.options.length)) {
            throw new Error(`Question #${qNum}: Correct option index out of bounds.`);
        }
    } else if (q.type === 'true_false') {
        const correctIdx = Number(q.correctAnswer);
        if (isNaN(correctIdx) || (correctIdx !== 0 && correctIdx !== 1)) {
            throw new Error(`Question #${qNum}: True/False must have True or False selected.`);
        }
    } else if (q.type === 'short_answer') {
        // Valid by default
    } else {
        throw new Error(`Question #${qNum}: Unsupported question type '${q.type}'.`);
    }
}

// Create a new Quiz
module.exports.createQuiz = async (req, res) => {
    try {
        const { title, description, roomId, timeLimit, totalMarks, deadline, topic, shuffleQuestions, allowedAttempts, showResultsImmediately, scheduledAt, isPublished } = req.body;
        
        if (!title || !roomId || !timeLimit || !deadline) {
            return res.status(400).json({ message: "Missing required fields (title, roomId, timeLimit, deadline)" });
        }

        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) return res.status(403).json({ message: "Only authorized teachers can create quizzes." });

        const parsedAttempts = Math.max(1, Number(allowedAttempts) || 1);
        const parsedTimeLimit = Math.max(1, Number(timeLimit) || 15);

        const quiz = await Quiz.create({
            title: title.trim(),
            description: description?.trim() || '',
            roomId,
            createdBy: req.user._id,
            timeLimit: parsedTimeLimit,
            totalMarks: Number(totalMarks) || 0,
            deadline: new Date(deadline),
            topic: topic?.trim() || "General",
            shuffleQuestions: !!shuffleQuestions,
            allowedAttempts: parsedAttempts,
            showResultsImmediately: showResultsImmediately !== undefined ? !!showResultsImmediately : true,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            isPublished: !!isPublished
        });

        res.status(201).json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Quiz details
module.exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to update this quiz." });

        const { title, description, timeLimit, totalMarks, deadline, topic, shuffleQuestions, allowedAttempts, showResultsImmediately, scheduledAt, isPublished } = req.body;

        if (title !== undefined) quiz.title = title.trim();
        if (description !== undefined) quiz.description = description.trim();
        if (timeLimit !== undefined) quiz.timeLimit = Math.max(1, Number(timeLimit));
        if (totalMarks !== undefined) quiz.totalMarks = Number(totalMarks);
        if (deadline !== undefined) quiz.deadline = new Date(deadline);
        if (topic !== undefined) quiz.topic = topic.trim();
        if (shuffleQuestions !== undefined) quiz.shuffleQuestions = !!shuffleQuestions;
        if (allowedAttempts !== undefined) quiz.allowedAttempts = Math.max(1, Number(allowedAttempts));
        if (showResultsImmediately !== undefined) quiz.showResultsImmediately = !!showResultsImmediately;
        if (scheduledAt !== undefined) quiz.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        if (isPublished !== undefined) quiz.isPublished = !!isPublished;

        await quiz.save();

        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add / Replace questions to a quiz
module.exports.addQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const { questions } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });
        if (!Array.isArray(questions)) return res.status(400).json({ message: "Questions must be an array." });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to modify this quiz." });

        let calculatedTotalMarks = 0;
        const formattedQuestions = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            validateQuestion(q, i);
            const marks = Number(q.marks) || 1;
            calculatedTotalMarks += marks;

            formattedQuestions.push({
                quizId: id,
                type: q.type || 'mcq',
                questionText: q.questionText.trim(),
                options: Array.isArray(q.options) ? q.options.map(opt => ({ text: opt.text?.trim() || '' })) : [],
                correctAnswer: q.correctAnswer,
                referenceAnswer: q.referenceAnswer?.trim() || '',
                marks,
                order: q.order !== undefined ? Number(q.order) : i,
                difficulty: q.difficulty || 'medium',
                explanation: q.explanation?.trim() || ''
            });
        }

        await Question.deleteMany({ quizId: id });
        if (formattedQuestions.length > 0) {
            await Question.insertMany(formattedQuestions);
        }

        quiz.totalMarks = calculatedTotalMarks;
        await quiz.save();

        res.status(201).json({
            success: true,
            message: "Questions saved successfully.",
            count: formattedQuestions.length,
            totalMarks: calculatedTotalMarks
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Toggle Publish
module.exports.publishQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to publish this quiz." });

        quiz.isPublished = !quiz.isPublished;
        await quiz.save();

        if (quiz.isPublished && quiz.roomId) {
            const room = await Room.findById(quiz.roomId);
            if (room) {
                const enrolledStudentIds = (room.members || []).filter(m => m.toString() !== req.user._id.toString());
                if (enrolledStudentIds.length > 0) {
                    const notifs = enrolledStudentIds.map(stId => ({
                        recipient: stId,
                        actor: req.user._id,
                        type: "quiz_published",
                        title: "New Quiz Published",
                        message: `Quiz "${quiz.title}" (${quiz.totalMarks} pts) is now live in "${room.name}".`,
                        entityType: "quiz",
                        entityId: quiz._id,
                        roomId: room._id,
                        metadata: { quizId: quiz._id, totalMarks: quiz.totalMarks, deadline: quiz.deadline }
                    }));
                    await notificationService.createManyNotifications(notifs, req.io);
                }
            }
        }

        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Quiz
module.exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to delete this quiz." });

        await Quiz.findByIdAndDelete(id);
        await Question.deleteMany({ quizId: id });
        await Attempt.deleteMany({ quizId: id });

        res.json({ success: true, message: "Quiz deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Quizzes by Room
module.exports.getQuizzesByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(roomId)) return res.status(400).json({ message: "Invalid Room ID" });

        const userRole = (req.user.role || 'student').toLowerCase();
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (userRole === 'student') {
            const isMember = room.members?.some(m => m.toString() === req.user._id.toString()) || room.owner?.toString() === req.user._id.toString();
            if (!isMember) return res.status(403).json({ message: "Not enrolled in this classroom." });
        }

        let filter = { roomId };
        if (userRole === 'student') {
            filter.isPublished = true;
        }

        const quizzes = await Quiz.find(filter).populate('createdBy', 'fullname email').sort({ createdAt: -1 });
        
        let quizzesWithStatus = quizzes;
        if (userRole === 'student') {
            const attempts = await Attempt.find({ roomId, studentId: req.user._id });
            const attemptedQuizIds = attempts.filter(a => a.status !== 'in_progress').map(a => a.quizId.toString());
            const inProgressQuizIds = attempts.filter(a => a.status === 'in_progress').map(a => a.quizId.toString());
            
            quizzesWithStatus = quizzes.map(q => ({
                ...q.toObject(),
                hasAttempted: attemptedQuizIds.includes(q._id.toString()),
                isInProgress: inProgressQuizIds.includes(q._id.toString())
            }));
        }

        res.json({ success: true, quizzes: quizzesWithStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Quiz details (sanitized for students)
module.exports.getQuizDetails = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id).populate('createdBy', 'fullname email');
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const userRole = (req.user.role || 'student').toLowerCase();

        if (userRole === 'student') {
            if (!quiz.isPublished) return res.status(403).json({ message: "Quiz is not published yet." });
            const room = await Room.findById(quiz.roomId);
            const isMember = room && (room.members?.some(m => m.toString() === req.user._id.toString()) || room.owner?.toString() === req.user._id.toString());
            if (!isMember) {
                return res.status(403).json({ message: "Not enrolled in this classroom." });
            }
        }

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

        if (userRole === 'student') {
            const safeQuestions = questions.map(q => ({
                _id: q._id,
                type: q.type,
                questionText: q.questionText,
                options: q.options,
                marks: q.marks,
                order: q.order,
                difficulty: q.difficulty
            }));
            return res.json({ success: true, quiz, questions: safeQuestions });
        }

        res.json({ success: true, quiz, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Start a Quiz Attempt
module.exports.startQuiz = async (req, res) => {
    try {
        const userRole = (req.user?.role || 'student').toLowerCase();
        if (userRole !== 'student') {
            return res.status(403).json({ message: "Only students can start quiz attempts." });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id).populate('createdBy', 'fullname email');
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if (!quiz.isPublished) return res.status(400).json({ message: "Quiz is not published yet." });
        if (new Date() > new Date(quiz.deadline)) return res.status(400).json({ message: "Quiz deadline has passed." });

        const room = await Room.findById(quiz.roomId);
        const isMember = room && (room.members?.some(m => m.toString() === req.user._id.toString()) || room.owner?.toString() === req.user._id.toString());
        if (!isMember) {
            return res.status(403).json({ message: "Not enrolled in this classroom." });
        }

        const rawQuestions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

        let attempt = await Attempt.findOne({ quizId: id, studentId: req.user._id, status: 'in_progress' });
        
        if (!attempt) {
            const completedCount = await Attempt.countDocuments({
                quizId: id,
                studentId: req.user._id,
                status: { $in: ['submitted', 'graded', 'expired'] }
            });

            if (completedCount >= (quiz.allowedAttempts || 1)) {
                return res.status(400).json({ message: "Maximum allowed attempts reached for this quiz." });
            }

            let questionOrderIds = rawQuestions.map(q => q._id);
            if (quiz.shuffleQuestions) {
                questionOrderIds = [...questionOrderIds];
                for (let i = questionOrderIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [questionOrderIds[i], questionOrderIds[j]] = [questionOrderIds[j], questionOrderIds[i]];
                }
            }

            attempt = await Attempt.create({
                quizId: id,
                studentId: req.user._id,
                roomId: quiz.roomId,
                startedAt: new Date(),
                status: 'in_progress',
                attemptNumber: completedCount + 1,
                questionOrder: questionOrderIds,
                flaggedQuestions: [],
                score: 0,
                objectiveMarks: 0,
                subjectiveMarks: 0,
                percentage: 0,
                isEvaluated: false,
                answers: []
            });
        }

        let orderedQuestions = rawQuestions;
        if (Array.isArray(attempt.questionOrder) && attempt.questionOrder.length > 0) {
            const qMap = new Map(rawQuestions.map(q => [q._id.toString(), q]));
            orderedQuestions = attempt.questionOrder
                .map(qId => qMap.get(qId.toString()))
                .filter(Boolean);
            if (orderedQuestions.length < rawQuestions.length) {
                const existingIds = new Set(orderedQuestions.map(q => q._id.toString()));
                rawQuestions.forEach(q => {
                    if (!existingIds.has(q._id.toString())) orderedQuestions.push(q);
                });
            }
        }

        const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
        const totalDurationSeconds = quiz.timeLimit * 60;
        const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

        const safeQuestions = orderedQuestions.map(q => ({
            _id: q._id,
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            marks: q.marks,
            order: q.order,
            difficulty: q.difficulty
        }));

        res.status(200).json({
            success: true,
            quiz,
            attempt: {
                _id: attempt._id,
                startedAt: attempt.startedAt,
                remainingSeconds,
                timeLimit: quiz.timeLimit,
                attemptNumber: attempt.attemptNumber,
                allowedAttempts: quiz.allowedAttempts || 1,
                status: attempt.status,
                savedAnswers: attempt.answers || [],
                flaggedQuestions: attempt.flaggedQuestions || []
            },
            questions: safeQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Save in-progress answers and flags (Auto-save)
module.exports.saveProgress = async (req, res) => {
    try {
        const userRole = (req.user?.role || 'student').toLowerCase();
        if (userRole !== 'student') return res.status(403).json({ message: "Unauthorized." });

        const { id } = req.params;
        const { answers, flaggedQuestions } = req.body;

        const attempt = await Attempt.findOne({ quizId: id, studentId: req.user._id, status: 'in_progress' });
        if (!attempt) return res.status(404).json({ message: "No active in-progress attempt found." });

        if (Array.isArray(answers)) {
            attempt.answers = answers.map(a => ({
                questionId: a.questionId,
                selectedOption: a.selectedOption !== undefined ? a.selectedOption : null,
                selectedOptions: Array.isArray(a.selectedOptions) ? a.selectedOptions : [],
                textAnswer: a.textAnswer || ''
            }));
        }

        if (Array.isArray(flaggedQuestions)) {
            attempt.flaggedQuestions = flaggedQuestions;
        }

        await attempt.save();

        res.json({ success: true, message: "Progress saved." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Final Submit Quiz
module.exports.attemptQuiz = async (req, res) => {
    try {
        const userRole = (req.user?.role || 'student').toLowerCase();
        if (userRole !== 'student') {
            return res.status(403).json({ message: "Only students can attempt quizzes." });
        }

        const { id } = req.params;
        const { answers } = req.body;
        
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if (!quiz.isPublished) return res.status(400).json({ message: "Quiz not active" });

        let attempt = await Attempt.findOne({ quizId: id, studentId: req.user._id, status: 'in_progress' });

        if (!attempt) {
            const completedCount = await Attempt.countDocuments({
                quizId: id,
                studentId: req.user._id,
                status: { $in: ['submitted', 'graded', 'expired'] }
            });
            if (completedCount >= (quiz.allowedAttempts || 1)) {
                return res.status(400).json({ message: "You have already completed the allowed attempts for this quiz." });
            }
            attempt = await Attempt.create({
                quizId: id,
                studentId: req.user._id,
                roomId: quiz.roomId,
                startedAt: new Date(),
                status: 'in_progress',
                attemptNumber: completedCount + 1,
                answers: []
            });
        }

        // Server-Side Time Limit Enforcement (45s grace period)
        const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
        const maxAllowedMs = (quiz.timeLimit * 60 * 1000) + 45000;
        let isExpired = elapsedMs > maxAllowedMs;

        const questions = await Question.find({ quizId: id });
        let objectiveScore = 0;
        let subjectiveScore = 0;
        let requiresManualEvaluation = false;
        const processedAnswers = [];
        const submittedAnswers = Array.isArray(answers) ? answers : (attempt.answers || []);

        for (let q of questions) {
            const userAns = submittedAnswers.find(a => a.questionId?.toString() === q._id.toString());
            let marksAwarded = 0;

            if (userAns) {
                if (q.type === 'short_answer') {
                    requiresManualEvaluation = true;
                    processedAnswers.push({
                        questionId: q._id,
                        textAnswer: userAns.textAnswer || '',
                        marksAwarded: 0,
                        feedback: ''
                    });
                } else if (q.type === 'multiple_select') {
                    const userSelected = Array.isArray(userAns.selectedOptions) ? [...userAns.selectedOptions].sort((a, b) => a - b) : [];
                    const correctAnswers = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort((a, b) => a - b) : [];
                    const isExactMatch = userSelected.length === correctAnswers.length && userSelected.every((val, idx) => val === correctAnswers[idx]);
                    if (isExactMatch && !isExpired) {
                        marksAwarded = q.marks;
                        objectiveScore += q.marks;
                    }
                    processedAnswers.push({
                        questionId: q._id,
                        selectedOptions: userSelected,
                        marksAwarded
                    });
                } else {
                    if (userAns.selectedOption !== null && userAns.selectedOption !== undefined && Number(userAns.selectedOption) === Number(q.correctAnswer) && !isExpired) {
                        marksAwarded = q.marks;
                        objectiveScore += q.marks;
                    }
                    processedAnswers.push({
                        questionId: q._id,
                        selectedOption: userAns.selectedOption,
                        marksAwarded
                    });
                }
            } else {
                processedAnswers.push({
                    questionId: q._id,
                    selectedOption: null,
                    marksAwarded: 0
                });
            }
        }

        const totalScore = objectiveScore + subjectiveScore;
        const totalMarks = quiz.totalMarks || questions.reduce((sum, q) => sum + q.marks, 0);
        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

        attempt.answers = processedAnswers;
        attempt.objectiveMarks = objectiveScore;
        attempt.subjectiveMarks = subjectiveScore;
        attempt.score = totalScore;
        attempt.percentage = percentage;
        attempt.submittedAt = new Date();
        attempt.status = isExpired ? 'expired' : (requiresManualEvaluation ? 'submitted' : 'graded');
        attempt.isEvaluated = !requiresManualEvaluation && !isExpired;
        if (attempt.isEvaluated) {
            attempt.gradedAt = new Date();
        }

        await attempt.save();

        // Notify quiz creator / teacher of submission
        if (quiz.createdBy) {
            await notificationService.createNotification({
                recipient: quiz.createdBy,
                actor: req.user._id,
                type: "quiz_submitted",
                title: "Quiz Attempt Submitted",
                message: `${req.user.fullname} completed attempt #${attempt.attemptNumber} for "${quiz.title}".`,
                entityType: "attempt",
                entityId: attempt._id,
                roomId: quiz.roomId,
                metadata: { quizId: quiz._id, attemptId: attempt._id },
                io: req.io
            });
        }

        res.status(200).json({
            success: true,
            attempt,
            message: isExpired ? "Quiz submitted after time limit expired." : "Quiz submitted successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Student Result
module.exports.getStudentResult = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        const { attemptNumber } = req.query;
        const userRole = (req.user.role || 'student').toLowerCase();
        const targetStudentId = studentId || req.user._id.toString();

        if (userRole === 'student' && req.user._id.toString() !== targetStudentId) {
            return res.status(403).json({ message: "Unauthorized to view this result." });
        }

        const quiz = await Quiz.findById(id).populate('createdBy', 'fullname email');
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        if (userRole === 'student' && !quiz.isPublished) {
            return res.status(403).json({ message: "Quiz is not published." });
        }

        if (userRole === 'teacher') {
            const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
            if (!authorized) return res.status(403).json({ message: "Not authorized to view student results." });
        }

        let query = { quizId: id, studentId: targetStudentId, status: { $ne: 'in_progress' } };
        if (attemptNumber) {
            query.attemptNumber = Number(attemptNumber);
        }

        const attempt = await Attempt.findOne(query).populate('studentId', 'fullname email').sort({ attemptNumber: -1, createdAt: -1 });
        if (!attempt) return res.status(404).json({ message: "Attempt not found" });

        const allAttempts = await Attempt.find({ quizId: id, studentId: targetStudentId, status: { $ne: 'in_progress' } })
            .select('attemptNumber score percentage status submittedAt isEvaluated')
            .sort({ attemptNumber: 1 });

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });
        const isResultHidden = userRole === 'student' && !quiz.showResultsImmediately && attempt.status !== 'graded';

        if (isResultHidden) {
            return res.json({
                success: true,
                isResultHidden: true,
                message: "Your quiz has been submitted successfully. Results will be available when your instructor releases them.",
                attempt: {
                    _id: attempt._id,
                    attemptNumber: attempt.attemptNumber,
                    status: attempt.status,
                    submittedAt: attempt.submittedAt,
                    isEvaluated: attempt.isEvaluated
                },
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    topic: quiz.topic,
                    totalMarks: quiz.totalMarks,
                    timeLimit: quiz.timeLimit,
                    showResultsImmediately: quiz.showResultsImmediately
                },
                allAttempts
            });
        }

        res.json({
            success: true,
            isResultHidden: false,
            attempt,
            quiz,
            questions,
            allAttempts
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Student: Get All My Attempts History
module.exports.getMyAttempts = async (req, res) => {
    try {
        const { id } = req.params;
        const attempts = await Attempt.find({ quizId: id, studentId: req.user._id, status: { $ne: 'in_progress' } })
            .sort({ attemptNumber: 1 });
        res.json({ success: true, attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Teacher: Get Aggregate Quiz Results Overview
module.exports.getQuizResults = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can view aggregate results." });

        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to view aggregate results for this quiz." });

        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } })
            .populate('studentId', 'fullname email')
            .sort({ createdAt: -1 });

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

        const totalAttempts = attempts.length;
        const gradedAttempts = attempts.filter(a => a.status === 'graded');
        const pendingEvaluation = attempts.filter(a => a.status === 'submitted');
        const expiredAttempts = attempts.filter(a => a.status === 'expired');

        const scores = attempts.map(a => a.score);
        const averageScore = totalAttempts > 0 ? (scores.reduce((a, b) => a + b, 0) / totalAttempts) : 0;
        const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
        const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0;
        const averagePercentage = quiz.totalMarks > 0 ? Math.round((averageScore / quiz.totalMarks) * 100) : 0;

        res.json({ 
            success: true, 
            quiz,
            analytics: {
                totalAttempts,
                gradedCount: gradedAttempts.length,
                pendingCount: pendingEvaluation.length,
                expiredCount: expiredAttempts.length,
                averageScore: Number(averageScore.toFixed(1)),
                averagePercentage,
                highestScore,
                lowestScore
            },
            attempts,
            questions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Teacher: Get Single Attempt Details with Answers and Rubrics
module.exports.getAttemptDetail = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Unauthorized." });

        const { id, attemptId } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Unauthorized." });

        const attempt = await Attempt.findById(attemptId).populate('studentId', 'fullname email');
        if (!attempt) return res.status(404).json({ message: "Attempt not found" });

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

        res.json({ success: true, attempt, quiz, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Teacher: Evaluate Attempt
module.exports.evaluateAttempt = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can evaluate attempts." });

        const { id, attemptId } = req.params;
        const { questionEvaluations, teacherFeedback } = req.body;

        const attempt = await Attempt.findById(attemptId);
        if (!attempt || attempt.quizId.toString() !== id) {
            return res.status(404).json({ message: "Attempt not found" });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to evaluate this quiz." });

        const questions = await Question.find({ quizId: id });
        const qMap = new Map(questions.map(q => [q._id.toString(), q]));

        if (Array.isArray(questionEvaluations)) {
            for (let ev of questionEvaluations) {
                const targetQ = qMap.get(ev.questionId?.toString());
                if (!targetQ) continue;

                const awarded = Number(ev.marksAwarded);
                if (isNaN(awarded) || awarded < 0) {
                    return res.status(400).json({ message: `Marks awarded cannot be negative for question '${targetQ.questionText.slice(0, 30)}...'` });
                }
                if (awarded > targetQ.marks) {
                    return res.status(400).json({ message: `Marks awarded (${awarded}) exceeds maximum (${targetQ.marks}) for question '${targetQ.questionText.slice(0, 30)}...'` });
                }

                const targetAns = attempt.answers.find(a => a.questionId.toString() === ev.questionId.toString());
                if (targetAns) {
                    targetAns.marksAwarded = awarded;
                    if (ev.feedback !== undefined) targetAns.feedback = ev.feedback.trim();
                } else {
                    attempt.answers.push({
                        questionId: targetQ._id,
                        selectedOption: null,
                        textAnswer: '',
                        marksAwarded: awarded,
                        feedback: ev.feedback?.trim() || ''
                    });
                }
            }
        }

        let objMarks = 0;
        let subjMarks = 0;

        for (let ans of attempt.answers) {
            const q = qMap.get(ans.questionId.toString());
            if (q) {
                if (q.type === 'short_answer') {
                    subjMarks += (ans.marksAwarded || 0);
                } else {
                    objMarks += (ans.marksAwarded || 0);
                }
            }
        }

        const totalScore = objMarks + subjMarks;
        const totalQuizMarks = quiz.totalMarks || questions.reduce((sum, q) => sum + q.marks, 0);
        const percentage = totalQuizMarks > 0 ? Math.round((totalScore / totalQuizMarks) * 100) : 0;

        attempt.objectiveMarks = objMarks;
        attempt.subjectiveMarks = subjMarks;
        attempt.score = totalScore;
        attempt.percentage = percentage;
        if (teacherFeedback !== undefined) attempt.teacherFeedback = teacherFeedback.trim();
        attempt.isEvaluated = true;
        attempt.status = 'graded';
        attempt.gradedAt = new Date();
        attempt.evaluatedBy = req.user._id;

        await attempt.save();

        // Notify student of graded quiz
        if (attempt.studentId) {
            await notificationService.createNotification({
                recipient: attempt.studentId,
                actor: req.user._id,
                type: "quiz_graded",
                title: "Quiz Graded",
                message: `Your score for "${quiz.title}" is ready: ${attempt.score} / ${totalQuizMarks} (${attempt.percentage}%).`,
                entityType: "attempt",
                entityId: attempt._id,
                roomId: quiz.roomId,
                metadata: { quizId: quiz._id, attemptId: attempt._id, score: attempt.score, totalMarks: totalQuizMarks },
                io: req.io
            });
        }

        res.json({ success: true, attempt });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =========================================================================
// PHASE 5: COMPREHENSIVE QUIZ ANALYTICS & REPORTING ENDPOINTS
// =========================================================================

// 1. Teacher: Comprehensive Quiz Analytics
module.exports.getComprehensiveQuizAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Unauthorized. Teacher role required." });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id).populate('createdBy', 'fullname email');
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to access analytics for this classroom." });

        const room = await Room.findById(quiz.roomId);
        const enrolledStudents = (room?.members || []).filter(m => m.toString() !== room.owner?.toString());

        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } })
            .populate('studentId', 'fullname email')
            .sort({ attemptNumber: 1, createdAt: 1 });

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

        // Basic Counts
        const totalAttempts = attempts.length;
        const gradedAttempts = attempts.filter(a => a.status === 'graded');
        const pendingCount = attempts.filter(a => a.status === 'submitted').length;
        const expiredCount = attempts.filter(a => a.status === 'expired').length;

        // Scores & Percentage Summary
        const scores = attempts.map(a => a.score);
        const percentages = attempts.map(a => a.percentage || (quiz.totalMarks > 0 ? Math.round((a.score / quiz.totalMarks) * 100) : 0));
        
        const averageScore = totalAttempts > 0 ? Number((scores.reduce((a, b) => a + b, 0) / totalAttempts).toFixed(1)) : 0;
        const averagePercentage = totalAttempts > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / totalAttempts) : 0;
        const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
        const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0;

        // Median calculation
        let medianScore = 0;
        if (totalAttempts > 0) {
            const sortedScores = [...scores].sort((a, b) => a - b);
            const mid = Math.floor(sortedScores.length / 2);
            medianScore = sortedScores.length % 2 !== 0 ? sortedScores[mid] : Number(((sortedScores[mid - 1] + sortedScores[mid]) / 2).toFixed(1));
        }

        // Score Distribution (0-20, 21-40, 41-60, 61-80, 81-100)
        const scoreDistribution = {
            '0-20%': 0,
            '21-40%': 0,
            '41-60%': 0,
            '61-80%': 0,
            '81-100%': 0
        };

        percentages.forEach(p => {
            if (p <= 20) scoreDistribution['0-20%']++;
            else if (p <= 40) scoreDistribution['21-40%']++;
            else if (p <= 60) scoreDistribution['41-60%']++;
            else if (p <= 80) scoreDistribution['61-80%']++;
            else scoreDistribution['81-100%']++;
        });

        // Time Analytics (duration in seconds)
        const durations = attempts.map(a => {
            if (a.submittedAt && a.startedAt) {
                return Math.max(0, Math.floor((new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 1000));
            }
            return 0;
        }).filter(d => d > 0);

        const averageDurationSeconds = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
        const fastestDurationSeconds = durations.length > 0 ? Math.min(...durations) : 0;
        const longestDurationSeconds = durations.length > 0 ? Math.max(...durations) : 0;

        // Topic Performance Summary
        const topicSummary = {
            topic: quiz.topic || 'General',
            totalMarks: quiz.totalMarks,
            averageScore,
            averagePercentage,
            attemptCount: totalAttempts
        };

        // Question Level Correctness summary to derive insights
        const questionMetrics = questions.map(q => {
            let totalResponses = 0;
            let correctCount = 0;

            attempts.forEach(att => {
                const ans = att.answers.find(a => a.questionId.toString() === q._id.toString());
                if (ans) {
                    totalResponses++;
                    if (ans.marksAwarded === q.marks && q.marks > 0) {
                        correctCount++;
                    }
                }
            });

            const accuracy = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0;
            return {
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                marks: q.marks,
                accuracy,
                totalResponses,
                correctCount
            };
        });

        const sortedByAccuracy = [...questionMetrics].sort((a, b) => a.accuracy - b.accuracy);
        const mostDifficultQuestion = sortedByAccuracy.length > 0 ? sortedByAccuracy[0] : null;
        const easiestQuestion = sortedByAccuracy.length > 0 ? sortedByAccuracy[sortedByAccuracy.length - 1] : null;

        // Student-by-student Performance Aggregation
        const studentMap = new Map();
        attempts.forEach(att => {
            const sId = att.studentId?._id?.toString() || att.studentId?.toString();
            if (!sId) return;

            if (!studentMap.has(sId)) {
                studentMap.set(sId, {
                    studentId: sId,
                    studentName: att.studentId?.fullname || 'Student',
                    studentEmail: att.studentId?.email || '',
                    attempts: [],
                    bestScore: att.score,
                    latestScore: att.score,
                    latestPercentage: att.percentage || 0,
                    status: att.status
                });
            }

            const record = studentMap.get(sId);
            const duration = (att.submittedAt && att.startedAt) ? Math.max(0, Math.floor((new Date(att.submittedAt).getTime() - new Date(att.startedAt).getTime()) / 1000)) : 0;

            record.attempts.push({
                attemptNumber: att.attemptNumber,
                score: att.score,
                percentage: att.percentage || 0,
                durationSeconds: duration,
                status: att.status,
                submittedAt: att.submittedAt
            });

            if (att.score > record.bestScore) record.bestScore = att.score;
            record.latestScore = att.score;
            record.latestPercentage = att.percentage || 0;
            record.status = att.status;
        });

        // Compute improvement delta for multiple attempts
        const studentPerformances = Array.from(studentMap.values()).map(st => {
            let improvementDelta = 0;
            if (st.attempts.length >= 2) {
                const firstPct = st.attempts[0].percentage;
                const lastPct = st.attempts[st.attempts.length - 1].percentage;
                improvementDelta = lastPct - firstPct;
            }
            return {
                ...st,
                attemptCount: st.attempts.length,
                improvementDelta
            };
        });

        res.json({
            success: true,
            quiz,
            summary: {
                totalEnrolled: enrolledStudents.length,
                uniqueStudentsAttempted: studentPerformances.length,
                totalAttempts,
                gradedCount: gradedAttempts.length,
                pendingCount,
                expiredCount,
                averageScore,
                averagePercentage,
                highestScore,
                lowestScore,
                medianScore
            },
            scoreDistribution,
            timeAnalytics: {
                averageDurationSeconds,
                fastestDurationSeconds,
                longestDurationSeconds
            },
            topicAnalytics: topicSummary,
            insights: {
                mostDifficultQuestion,
                easiestQuestion,
                scoreSpread: highestScore - lowestScore
            },
            studentPerformances
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Teacher: Question-Level Analytics & Option Distribution
module.exports.getQuestionLevelAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Unauthorized. Teacher role required." });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to access question analytics." });

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });
        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } });

        const questionAnalytics = questions.map((q, idx) => {
            let totalResponses = 0;
            let correctCount = 0;
            let incorrectCount = 0;
            let totalMarksAwarded = 0;

            // Option selection count array
            const optionFrequency = Array.isArray(q.options) ? q.options.map((opt, oIdx) => ({
                index: oIdx,
                text: opt.text,
                count: 0,
                percentage: 0,
                isCorrect: q.type === 'multiple_select' 
                    ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(oIdx))
                    : Number(q.correctAnswer) === oIdx
            })) : [];

            attempts.forEach(att => {
                const ans = att.answers.find(a => a.questionId.toString() === q._id.toString());
                if (ans) {
                    totalResponses++;
                    totalMarksAwarded += (ans.marksAwarded || 0);

                    if (ans.marksAwarded === q.marks && q.marks > 0) {
                        correctCount++;
                    } else {
                        incorrectCount++;
                    }

                    if (q.type === 'mcq' || q.type === 'true_false') {
                        if (ans.selectedOption !== null && ans.selectedOption !== undefined && optionFrequency[ans.selectedOption]) {
                            optionFrequency[ans.selectedOption].count++;
                        }
                    } else if (q.type === 'multiple_select' && Array.isArray(ans.selectedOptions)) {
                        ans.selectedOptions.forEach(optIdx => {
                            if (optionFrequency[optIdx]) {
                                optionFrequency[optIdx].count++;
                            }
                        });
                    }
                }
            });

            // Calculate option percentages
            if (totalResponses > 0) {
                optionFrequency.forEach(opt => {
                    opt.percentage = Math.round((opt.count / totalResponses) * 100);
                });
            }

            const accuracy = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0;
            const averageMarks = totalResponses > 0 ? Number((totalMarksAwarded / totalResponses).toFixed(1)) : 0;

            // Difficulty rule: >=80% -> Easy, 60-79% -> Moderate, <60% -> Difficult
            let difficulty = 'Moderate';
            if (q.type !== 'short_answer') {
                if (accuracy >= 80) difficulty = 'Easy';
                else if (accuracy < 60) difficulty = 'Difficult';
            }

            return {
                questionNumber: idx + 1,
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                marks: q.marks,
                totalResponses,
                correctCount,
                incorrectCount,
                accuracyPercentage: accuracy,
                averageMarks,
                difficulty,
                options: optionFrequency
            };
        });

        res.json({ success: true, quizTitle: quiz.title, totalAttempts: attempts.length, questions: questionAnalytics });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Student / Teacher: Individual Student Quiz Analytics
module.exports.getStudentQuizAnalytics = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        const userRole = (req.user.role || 'student').toLowerCase();
        const targetStudentId = studentId || req.user._id.toString();

        if (userRole === 'student' && req.user._id.toString() !== targetStudentId) {
            return res.status(403).json({ message: "Unauthorized. Students can only view their own analytics." });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        if (userRole === 'student' && !quiz.isPublished) {
            return res.status(403).json({ message: "Quiz is not published." });
        }

        if (userRole === 'teacher') {
            const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
            if (!authorized) return res.status(403).json({ message: "Unauthorized." });
        }

        const attempts = await Attempt.find({ quizId: id, studentId: targetStudentId, status: { $ne: 'in_progress' } })
            .populate('studentId', 'fullname email')
            .sort({ attemptNumber: 1 });

        if (attempts.length === 0) {
            return res.status(404).json({ message: "No completed attempts found for this student." });
        }

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

        const attemptProgression = attempts.map(att => {
            const duration = (att.submittedAt && att.startedAt) ? Math.max(0, Math.floor((new Date(att.submittedAt).getTime() - new Date(att.startedAt).getTime()) / 1000)) : 0;
            
            let correctQuestions = 0;
            att.answers.forEach(ans => {
                const q = questions.find(question => question._id.toString() === ans.questionId.toString());
                if (q && ans.marksAwarded === q.marks && q.marks > 0) {
                    correctQuestions++;
                }
            });

            return {
                attemptNumber: att.attemptNumber,
                score: att.score,
                percentage: att.percentage || (quiz.totalMarks > 0 ? Math.round((att.score / quiz.totalMarks) * 100) : 0),
                durationSeconds: duration,
                status: att.status,
                submittedAt: att.submittedAt,
                correctCount: correctQuestions,
                totalQuestions: questions.length
            };
        });

        const firstAttempt = attemptProgression[0];
        const latestAttempt = attemptProgression[attemptProgression.length - 1];
        const improvementPercentage = attemptProgression.length > 1 ? latestAttempt.percentage - firstAttempt.percentage : 0;

        res.json({
            success: true,
            quiz: {
                title: quiz.title,
                topic: quiz.topic,
                totalMarks: quiz.totalMarks
            },
            student: {
                id: targetStudentId,
                fullname: attempts[0].studentId?.fullname,
                email: attempts[0].studentId?.email
            },
            totalAttempts: attempts.length,
            bestScore: Math.max(...attempts.map(a => a.score)),
            latestScore: latestAttempt.score,
            latestPercentage: latestAttempt.percentage,
            improvementPercentage,
            attempts: attemptProgression
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Teacher: Export Quiz Results as CSV
module.exports.exportQuizResultsCSV = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Unauthorized. Teacher role required." });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Unauthorized." });

        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } })
            .populate('studentId', 'fullname email')
            .sort({ studentId: 1, attemptNumber: 1 });

        const headers = ["Student Name", "Email", "Attempt #", "Score", "Total Marks", "Percentage", "Status", "Submitted At"];
        const rows = attempts.map(att => {
            const studentName = (att.studentId?.fullname || 'Unknown').replace(/"/g, '""');
            const studentEmail = (att.studentId?.email || '').replace(/"/g, '""');
            const submittedStr = att.submittedAt ? new Date(att.submittedAt).toISOString() : '';
            return `"${studentName}","${studentEmail}",${att.attemptNumber},${att.score},${quiz.totalMarks},"${att.percentage || 0}%","${att.status}","${submittedStr}"`;
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="quiz_${quiz._id}_results.csv"`);
        return res.status(200).send(csvContent);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// AI: Generate quiz questions from notes
module.exports.generateQuizQuestions = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can generate quizzes." });

        if (!isAiConfigured()) {
            return res.status(503).json({ message: "AI is not configured. Set NIM_BASE_URL, NIM_API_KEY, and NIM_MODEL." });
        }

        const { notesText, questionCount, difficultyMix } = req.body;
        if (!notesText || !questionCount) {
            return res.status(400).json({ message: "Notes text and question count are required." });
        }

        const draft = await generateQuizQuestionsFromNotes({
            notesText,
            questionCount: Number(questionCount),
            difficultyMix: difficultyMix || { easy: 50, medium: 30, hard: 20 }
        });

        return res.json({ success: true, questions: draft.questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all attempts for a student
module.exports.getStudentAttempts = async (req, res) => {
    try {
        const { roomId } = req.query;
        let query = { studentId: req.user._id, status: { $ne: 'in_progress' } };
        if (roomId && roomId !== 'all') {
            query.roomId = roomId;
        }
        const attempts = await Attempt.find(query)
            .populate('quizId', 'title totalMarks deadline topic')
            .populate('roomId', 'name code')
            .sort({ createdAt: -1 });
        res.json({ success: true, attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
