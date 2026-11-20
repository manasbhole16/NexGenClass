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
    } else if (q.type === 'fill_blank') {
        if (!q.correctAnswer || (typeof q.correctAnswer === 'string' && !q.correctAnswer.trim())) {
            throw new Error(`Question #${qNum}: Fill in the Blank requires a correct expected answer.`);
        }
    } else if (q.type === 'short_answer' || q.type === 'long_answer') {
        // Subjective questions - referenceAnswer is optional but recommended
    } else {
        throw new Error(`Question #${qNum}: Unsupported question type '${q.type}'.`);
    }
}

// 1. Create a new Quiz
module.exports.createQuiz = async (req, res) => {
    try {
        const {
            title, description, roomId, timeLimit, totalMarks, passingMarks,
            startDate, deadline, topic, shuffleQuestions, allowedAttempts,
            showResultsImmediately, resultVisibility, resultReleaseDate,
            safeMode, scheduledAt, isPublished
        } = req.body;
        
        if (!title || !roomId || !timeLimit || !deadline) {
            return res.status(400).json({ message: "Missing required fields (title, roomId, timeLimit, deadline)" });
        }

        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) return res.status(403).json({ message: "Only authorized teachers can create quizzes." });

        const parsedAttempts = Math.max(1, Number(allowedAttempts) || 1);
        const parsedTimeLimit = Math.max(1, Number(timeLimit) || 15);
        const cleanTopic = topic?.trim() || "General";

        // Sync topic with room.topics
        const roomObj = await Room.findById(roomId);
        if (roomObj) {
            if (!Array.isArray(roomObj.topics)) roomObj.topics = [];
            if (!roomObj.topics.some(t => t.name.toLowerCase() === cleanTopic.toLowerCase())) {
                roomObj.topics.push({ name: cleanTopic, order: roomObj.topics.length });
                await roomObj.save();
                if (req.io) req.io.to(roomId).emit("classroom_updated", { _id: roomObj._id, topics: roomObj.topics });
            }
        }

        let status = 'draft';
        if (isPublished) {
            status = 'published';
        } else if (scheduledAt && new Date(scheduledAt) > new Date()) {
            status = 'scheduled';
        }

        const quiz = await Quiz.create({
            title: title.trim(),
            description: description?.trim() || '',
            roomId,
            createdBy: req.user._id,
            timeLimit: parsedTimeLimit,
            totalMarks: Number(totalMarks) || 0,
            passingMarks: Number(passingMarks) || 0,
            startDate: startDate ? new Date(startDate) : null,
            deadline: new Date(deadline),
            status,
            isPublished: !!isPublished,
            topic: cleanTopic,
            shuffleQuestions: !!shuffleQuestions,
            allowedAttempts: parsedAttempts,
            showResultsImmediately: showResultsImmediately !== undefined ? !!showResultsImmediately : true,
            resultVisibility: resultVisibility || (showResultsImmediately ? 'immediate' : 'manual_release'),
            resultReleaseDate: resultReleaseDate ? new Date(resultReleaseDate) : null,
            isResultsReleased: !!isPublished && (resultVisibility === 'immediate' || showResultsImmediately),
            safeMode: !!safeMode,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null
        });

        if (quiz.isPublished && req.io) {
            req.io.to(roomId).emit("quizCreated", quiz);
        }

        res.status(201).json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Update Quiz details
module.exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to update this quiz." });

        const {
            title, description, timeLimit, totalMarks, passingMarks,
            startDate, deadline, topic, shuffleQuestions, allowedAttempts,
            showResultsImmediately, resultVisibility, resultReleaseDate,
            safeMode, scheduledAt, isPublished
        } = req.body;

        const prevStart = quiz.startDate ? quiz.startDate.getTime() : null;
        const prevDeadline = quiz.deadline ? quiz.deadline.getTime() : null;

        if (title !== undefined) quiz.title = title.trim();
        if (description !== undefined) quiz.description = description.trim();
        if (timeLimit !== undefined) quiz.timeLimit = Math.max(1, Number(timeLimit));
        if (totalMarks !== undefined) quiz.totalMarks = Number(totalMarks);
        if (passingMarks !== undefined) quiz.passingMarks = Number(passingMarks);
        if (startDate !== undefined) quiz.startDate = startDate ? new Date(startDate) : null;
        if (deadline !== undefined) quiz.deadline = new Date(deadline);
        if (shuffleQuestions !== undefined) quiz.shuffleQuestions = !!shuffleQuestions;
        if (allowedAttempts !== undefined) quiz.allowedAttempts = Math.max(1, Number(allowedAttempts));
        if (showResultsImmediately !== undefined) quiz.showResultsImmediately = !!showResultsImmediately;
        if (resultVisibility !== undefined) quiz.resultVisibility = resultVisibility;
        if (resultReleaseDate !== undefined) quiz.resultReleaseDate = resultReleaseDate ? new Date(resultReleaseDate) : null;
        if (safeMode !== undefined) quiz.safeMode = !!safeMode;
        if (scheduledAt !== undefined) quiz.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

        if (topic !== undefined) {
            const cleanTopic = topic.trim() || "General";
            quiz.topic = cleanTopic;
            // Sync topic with room.topics
            const roomObj = await Room.findById(quiz.roomId);
            if (roomObj) {
                if (!Array.isArray(roomObj.topics)) roomObj.topics = [];
                if (!roomObj.topics.some(t => t.name.toLowerCase() === cleanTopic.toLowerCase())) {
                    roomObj.topics.push({ name: cleanTopic, order: roomObj.topics.length });
                    await roomObj.save();
                    if (req.io) req.io.to(quiz.roomId.toString()).emit("classroom_updated", { _id: roomObj._id, topics: roomObj.topics });
                }
            }
        }

        if (isPublished !== undefined) {
            quiz.isPublished = !!isPublished;
            quiz.status = quiz.isPublished ? 'published' : 'draft';
        }

        await quiz.save();

        if (req.io) {
            req.io.to(quiz.roomId.toString()).emit("quizUpdated", quiz);
        }

        // Schedule change on a live quiz -> notify enrolled students
        const scheduleChanged = (quiz.startDate ? quiz.startDate.getTime() : null) !== prevStart ||
            (quiz.deadline ? quiz.deadline.getTime() : null) !== prevDeadline;
        if (scheduleChanged && quiz.isPublished) {
            Room.findById(quiz.roomId).select("name members").then((room) => {
                if (!room) return;
                const stamp = Math.floor(Date.now() / 60000);
                return notificationService.createManyNotifications(
                    (room.members || []).filter((m) => m.toString() !== req.user._id.toString()).map((m) => ({
                        recipient: m, actor: req.user._id, type: "quiz_schedule_changed", priority: "high",
                        title: "Quiz Schedule Changed",
                        message: `The schedule for quiz "${quiz.title}" in "${room.name}" was updated.`,
                        entityType: "quiz", entityId: quiz._id, roomId: room._id,
                        actionUrl: `/room/${room._id}?tab=quizzes`,
                        metadata: { quizId: quiz._id, startsAt: quiz.startDate, deadline: quiz.deadline },
                        dedupKey: `quiz_sched:${quiz._id}:${m}:${stamp}`
                    })), req.io);
            }).catch((e) => console.error("Quiz schedule notify error:", e.message));
        }

        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Add / Replace questions to a quiz
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
                roomId: quiz.roomId,
                createdBy: req.user._id,
                type: q.type || 'mcq',
                questionText: q.questionText.trim(),
                options: Array.isArray(q.options) ? q.options.map(opt => ({ text: opt.text?.trim() || '' })) : [],
                correctAnswer: q.correctAnswer,
                referenceAnswer: q.referenceAnswer?.trim() || '',
                marks,
                order: q.order !== undefined ? Number(q.order) : i,
                difficulty: q.difficulty || 'medium',
                topic: q.topic?.trim() || quiz.topic || 'General',
                explanation: q.explanation?.trim() || '',
                imageUrl: q.imageUrl?.trim() || '',
                isBankQuestion: !!q.isBankQuestion
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

// 4. Toggle Publish or Publish Draft
module.exports.publishQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to publish this quiz." });

        quiz.isPublished = !quiz.isPublished;
        quiz.status = quiz.isPublished ? 'published' : 'draft';
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
                        message: `Quiz "${quiz.title}" (${quiz.totalMarks} pts) is now available in "${room.name}".`,
                        entityType: "quiz",
                        entityId: quiz._id,
                        roomId: room._id,
                        metadata: { quizId: quiz._id, totalMarks: quiz.totalMarks, deadline: quiz.deadline }
                    }));
                    await notificationService.createManyNotifications(notifs, req.io);
                }
            }
        }

        if (req.io) {
            req.io.to(quiz.roomId.toString()).emit("quizUpdated", quiz);
        }

        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Release Results to Students
module.exports.releaseResults = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Not authorized to release results." });

        quiz.isResultsReleased = true;
        quiz.showResultsImmediately = true;
        await quiz.save();

        // Notify students who attempted the quiz
        const attempts = await Attempt.find({ quizId: id, status: { $in: ['submitted', 'graded', 'expired'] } });
        const studentIds = Array.from(new Set(attempts.map(a => a.studentId.toString())));

        if (studentIds.length > 0) {
            const notifs = studentIds.map(stId => ({
                recipient: stId,
                actor: req.user._id,
                type: "quiz_results_released",
                title: "Quiz Results Released",
                message: `Results and answer explanations for "${quiz.title}" are now available for review.`,
                entityType: "quiz",
                entityId: quiz._id,
                roomId: quiz.roomId,
                metadata: { quizId: quiz._id }
            }));
            await notificationService.createManyNotifications(notifs, req.io);
        }

        if (req.io) {
            req.io.to(quiz.roomId.toString()).emit("quizResultsReleased", { quizId: quiz._id });
        }

        res.json({ success: true, message: "Results released to all students.", quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Delete Quiz
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

        if (req.io) {
            req.io.to(quiz.roomId.toString()).emit("quizDeleted", { id, roomId: quiz.roomId });
        }

        res.json({ success: true, message: "Quiz deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Get Quizzes by Room
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

// 8. Get Quiz details (sanitized for students)
module.exports.getQuizDetails = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });

        const quiz = await Quiz.findById(id).populate('createdBy', 'fullname email');
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const userRole = (req.user.role || 'student').toLowerCase();

        if (userRole === 'student') {
            if (!quiz.isPublished) return res.status(403).json({ message: "Quiz is not published yet." });
            if (quiz.startDate && new Date() < new Date(quiz.startDate)) {
                return res.status(403).json({ message: `Quiz will open on ${new Date(quiz.startDate).toLocaleString()}.` });
            }
            if (quiz.scheduledAt && new Date() < new Date(quiz.scheduledAt)) {
                return res.status(403).json({ message: `Quiz is scheduled to open on ${new Date(quiz.scheduledAt).toLocaleString()}.` });
            }
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
                difficulty: q.difficulty,
                imageUrl: q.imageUrl || ''
            }));
            return res.json({ success: true, quiz, questions: safeQuestions });
        }

        res.json({ success: true, quiz, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Start a Quiz Attempt
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

        if (quiz.startDate && new Date() < new Date(quiz.startDate)) {
            return res.status(400).json({ message: `Quiz will open on ${new Date(quiz.startDate).toLocaleString()}.` });
        }
        if (quiz.scheduledAt && new Date() < new Date(quiz.scheduledAt)) {
            return res.status(400).json({ message: `Quiz is scheduled to open on ${new Date(quiz.scheduledAt).toLocaleString()}.` });
        }

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
                answers: [],
                suspiciousEvents: []
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
            difficulty: q.difficulty,
            imageUrl: q.imageUrl || ''
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
                flaggedQuestions: attempt.flaggedQuestions || [],
                safeMode: quiz.safeMode || false
            },
            questions: safeQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Save in-progress answers and flags (Auto-save)
module.exports.saveProgress = async (req, res) => {
    try {
        const userRole = (req.user?.role || 'student').toLowerCase();
        if (userRole !== 'student') return res.status(403).json({ message: "Unauthorized." });

        const { id } = req.params;
        const { answers, flaggedQuestions } = req.body;

        const attempt = await Attempt.findOne({ quizId: id, studentId: req.user._id, status: 'in_progress' });
        if (!attempt) return res.status(404).json({ message: "No active in-progress attempt found." });

        const quiz = await Quiz.findById(id);
        if (quiz && quiz.timeLimit) {
            const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
            const maxAllowedMs = (quiz.timeLimit * 60 * 1000) + 60000;
            if (elapsedMs > maxAllowedMs) {
                return res.status(400).json({ message: "Attempt time limit expired. Progress cannot be saved." });
            }
        }

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

// 11. Log Safe Mode Suspicious Telemetry Event
module.exports.logSuspiciousEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { eventType, details } = req.body;

        if (!eventType) return res.status(400).json({ message: "eventType is required." });

        const attempt = await Attempt.findOne({ quizId: id, studentId: req.user._id, status: 'in_progress' });
        if (!attempt) return res.status(404).json({ message: "Active attempt not found." });

        if (!Array.isArray(attempt.suspiciousEvents)) {
            attempt.suspiciousEvents = [];
        }

        attempt.suspiciousEvents.push({
            eventType,
            timestamp: new Date(),
            details: details || ''
        });

        await attempt.save();

        res.json({ success: true, count: attempt.suspiciousEvents.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 12. Final Submit Quiz with Auto-Grading for Objective and Pending for Subjective
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
                answers: [],
                suspiciousEvents: []
            });
        }

        // Server-Side Time Limit Enforcement (60s grace period)
        const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
        const maxAllowedMs = (quiz.timeLimit * 60 * 1000) + 60000;
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
                if (q.type === 'short_answer' || q.type === 'long_answer') {
                    requiresManualEvaluation = true;
                    processedAnswers.push({
                        questionId: q._id,
                        textAnswer: userAns.textAnswer || '',
                        marksAwarded: 0,
                        feedback: ''
                    });
                } else if (q.type === 'fill_blank') {
                    // Auto-grade fill in the blank (trim & case-insensitive matching)
                    const studentText = (userAns.textAnswer || '').trim().toLowerCase();
                    let isCorrect = false;

                    if (Array.isArray(q.correctAnswer)) {
                        isCorrect = q.correctAnswer.some(ans => String(ans).trim().toLowerCase() === studentText);
                    } else if (q.correctAnswer) {
                        isCorrect = String(q.correctAnswer).trim().toLowerCase() === studentText;
                    }

                    if (isCorrect && !isExpired) {
                        marksAwarded = q.marks;
                        objectiveScore += q.marks;
                    }
                    processedAnswers.push({
                        questionId: q._id,
                        textAnswer: userAns.textAnswer || '',
                        marksAwarded
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
                    // MCQ & True/False
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
                    textAnswer: '',
                    marksAwarded: 0
                });
            }
        }

        const totalScore = objectiveScore + subjectiveScore;
        const totalMarks = quiz.totalMarks || questions.reduce((sum, q) => sum + q.marks, 0);
        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        const timeSpentSeconds = Math.min(Math.floor(elapsedMs / 1000), quiz.timeLimit * 60);

        attempt.answers = processedAnswers;
        attempt.objectiveMarks = objectiveScore;
        attempt.subjectiveMarks = subjectiveScore;
        attempt.score = totalScore;
        attempt.percentage = percentage;
        attempt.timeSpentSeconds = timeSpentSeconds;
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

        // Result Visibility Check for response payload
        let responseAttempt = attempt;
        const isResultHidden = userRole === 'student' && (
            (quiz.resultVisibility === 'manual_release' && !quiz.isResultsReleased && attempt.status !== 'graded') ||
            (quiz.resultVisibility === 'scheduled_release' && quiz.resultReleaseDate && new Date() < new Date(quiz.resultReleaseDate)) ||
            (!quiz.showResultsImmediately && !quiz.isResultsReleased && attempt.status !== 'graded')
        );

        if (isResultHidden) {
            responseAttempt = {
                _id: attempt._id,
                attemptNumber: attempt.attemptNumber,
                status: attempt.status,
                submittedAt: attempt.submittedAt,
                isEvaluated: attempt.isEvaluated,
                timeSpentSeconds: attempt.timeSpentSeconds
            };
        }

        res.status(200).json({
            success: true,
            attempt: responseAttempt,
            isResultHidden,
            message: isExpired ? "Quiz submitted after time limit expired." : "Quiz submitted successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Get Student Result with Result Visibility Security
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
            .select('attemptNumber score percentage status submittedAt isEvaluated timeSpentSeconds')
            .sort({ attemptNumber: 1 });

        // Result Visibility Check
        let isResultHidden = false;
        if (userRole === 'student') {
            if (quiz.resultVisibility === 'manual_release' && !quiz.isResultsReleased && attempt.status !== 'graded') {
                isResultHidden = true;
            } else if (quiz.resultVisibility === 'scheduled_release' && quiz.resultReleaseDate && new Date() < new Date(quiz.resultReleaseDate)) {
                isResultHidden = true;
            } else if (!quiz.showResultsImmediately && !quiz.isResultsReleased && attempt.status !== 'graded') {
                isResultHidden = true;
            }
        }

        if (isResultHidden) {
            return res.json({
                success: true,
                isResultHidden: true,
                message: "Your quiz has been submitted securely. Results and answer reviews will be available once released by your instructor.",
                attempt: {
                    _id: attempt._id,
                    attemptNumber: attempt.attemptNumber,
                    status: attempt.status,
                    submittedAt: attempt.submittedAt,
                    isEvaluated: attempt.isEvaluated,
                    timeSpentSeconds: attempt.timeSpentSeconds
                },
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    topic: quiz.topic,
                    totalMarks: quiz.totalMarks,
                    timeLimit: quiz.timeLimit,
                    passingMarks: quiz.passingMarks,
                    resultVisibility: quiz.resultVisibility
                },
                allAttempts
            });
        }

        const questions = await Question.find({ quizId: id }).sort({ order: 1, createdAt: 1 });

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

// 14. Student: Get All My Attempts History
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

// 15. Teacher: Get Aggregate Quiz Results Overview & Telemetry
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

        const passingScore = quiz.passingMarks || (quiz.totalMarks * 0.5);
        const passedCount = attempts.filter(a => a.score >= passingScore).length;
        const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

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
                lowestScore,
                passRate,
                passingScore
            },
            attempts,
            questions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 16. Teacher: Get Single Attempt Details
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

// 17. Teacher: Evaluate Attempt (Manual Subjective Grading)
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
                if (q.type === 'short_answer' || q.type === 'long_answer') {
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

// 18. QUESTION BANK: Get Reusable Question Bank Items
module.exports.getQuestionBank = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can access Question Bank." });

        const { roomId, topic, type, search } = req.query;

        let filter = {
            $or: [
                { isBankQuestion: true },
                { createdBy: req.user._id }
            ]
        };

        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            filter.$or.push({ roomId });
        }

        if (topic && topic !== 'All') {
            filter.topic = topic;
        }

        if (type && type !== 'All') {
            filter.type = type;
        }

        if (search && search.trim()) {
            filter.questionText = { $regex: search.trim(), $options: 'i' };
        }

        const questions = await Question.find(filter)
            .populate('quizId', 'title')
            .sort({ createdAt: -1 })
            .limit(100);

        // Group topics
        const topics = await Question.distinct('topic', { createdBy: req.user._id });

        res.json({ success: true, questions, topics: ['All', ...topics.filter(Boolean)] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 19. QUESTION BANK: Save Question to Bank
module.exports.saveToQuestionBank = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can save to Question Bank." });

        const { questionText, type, options, correctAnswer, referenceAnswer, marks, difficulty, topic, explanation, roomId } = req.body;

        if (!questionText || !questionText.trim()) {
            return res.status(400).json({ message: "Question text is required." });
        }

        const question = await Question.create({
            roomId: roomId || null,
            createdBy: req.user._id,
            type: type || 'mcq',
            questionText: questionText.trim(),
            options: Array.isArray(options) ? options : [],
            correctAnswer,
            referenceAnswer: referenceAnswer?.trim() || '',
            marks: Number(marks) || 1,
            difficulty: difficulty || 'medium',
            topic: topic?.trim() || 'General',
            explanation: explanation?.trim() || '',
            isBankQuestion: true
        });

        res.status(201).json({ success: true, question });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 20. QUESTION BANK: Import Questions into Target Quiz
module.exports.importQuestionsFromBank = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can import questions." });

        const { id } = req.params;
        const { questionIds } = req.body;

        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            return res.status(400).json({ message: "questionIds array is required." });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const bankQuestions = await Question.find({ _id: { $in: questionIds } });
        if (bankQuestions.length === 0) {
            return res.status(400).json({ message: "No valid bank questions found." });
        }

        const currentCount = await Question.countDocuments({ quizId: id });
        const importedDocs = bankQuestions.map((bq, idx) => ({
            quizId: id,
            roomId: quiz.roomId,
            createdBy: req.user._id,
            type: bq.type,
            questionText: bq.questionText,
            options: bq.options,
            correctAnswer: bq.correctAnswer,
            referenceAnswer: bq.referenceAnswer,
            marks: bq.marks,
            order: currentCount + idx,
            difficulty: bq.difficulty,
            topic: bq.topic || quiz.topic,
            explanation: bq.explanation,
            imageUrl: bq.imageUrl || ''
        }));

        await Question.insertMany(importedDocs);

        // Recalculate total marks
        const allQuizQuestions = await Question.find({ quizId: id });
        quiz.totalMarks = allQuizQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
        await quiz.save();

        res.status(201).json({ success: true, count: importedDocs.length, totalMarks: quiz.totalMarks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 21. AI Generation endpoint
module.exports.generateQuizQuestions = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can generate questions with AI." });

        const { notesText, questionCount = 5, difficultyMix } = req.body;

        if (!notesText || !notesText.trim()) {
            return res.status(400).json({ message: "Notes text is required for AI generation." });
        }

        const generated = await generateQuizQuestionsFromNotes(notesText, questionCount, difficultyMix);
        res.json({ success: true, questions: generated });
    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 22. Comprehensive Analytics
module.exports.getComprehensiveQuizAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Quiz ID" });
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const authorized = await isAuthorizedTeacher(req.user, quiz.roomId, quiz.createdBy);
        if (!authorized) return res.status(403).json({ message: "Only the classroom instructor can view quiz analytics." });

        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } }).populate('studentId', 'fullname email');
        const questions = await Question.find({ quizId: id }).sort({ order: 1 });

        const scores = attempts.map(a => a.score);
        const total = attempts.length;
        const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total) : 0;
        const max = total > 0 ? Math.max(...scores) : 0;
        const min = total > 0 ? Math.min(...scores) : 0;

        // Score Distribution: 0-25%, 26-50%, 51-75%, 76-100%
        const distribution = { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
        attempts.forEach(a => {
            const p = a.percentage || 0;
            if (p <= 25) distribution['0-25%']++;
            else if (p <= 50) distribution['26-50%']++;
            else if (p <= 75) distribution['51-75%']++;
            else distribution['76-100%']++;
        });

        // Question-Level Accuracy Analysis
        const questionAnalytics = questions.map((q, idx) => {
            let correctCount = 0;
            let totalAnswered = 0;
            attempts.forEach(att => {
                const ans = att.answers?.find(a => a.questionId?.toString() === q._id.toString());
                if (ans) {
                    totalAnswered++;
                    if (ans.marksAwarded >= q.marks) correctCount++;
                }
            });
            const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
            return {
                questionId: q._id,
                order: idx + 1,
                questionText: q.questionText,
                type: q.type,
                marks: q.marks,
                accuracy,
                correctCount,
                totalAnswered,
                isStrugglingTopic: accuracy < 40 && totalAnswered >= 3
            };
        });

        res.json({
            success: true,
            quiz,
            overview: {
                totalAttempts: total,
                averageScore: Number(avg.toFixed(1)),
                highestScore: max,
                lowestScore: min,
                averagePercentage: quiz.totalMarks > 0 ? Math.round((avg / quiz.totalMarks) * 100) : 0,
                distribution
            },
            questionAnalytics
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 23. Question Level Analytics
module.exports.getQuestionLevelAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const questions = await Question.find({ quizId: id }).sort({ order: 1 });
        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } });

        const analysis = questions.map((q, idx) => {
            let correct = 0;
            let answered = 0;
            attempts.forEach(att => {
                const ans = att.answers?.find(a => a.questionId?.toString() === q._id.toString());
                if (ans) {
                    answered++;
                    if (ans.marksAwarded >= q.marks) correct++;
                }
            });
            return {
                _id: q._id,
                order: idx + 1,
                questionText: q.questionText,
                type: q.type,
                marks: q.marks,
                accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
                totalResponses: answered
            };
        });

        res.json({ success: true, questions: analysis });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 24. Student Quiz Analytics
module.exports.getStudentQuizAnalytics = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        const attempts = await Attempt.find({ quizId: id, studentId, status: { $ne: 'in_progress' } }).sort({ attemptNumber: 1 });
        res.json({ success: true, attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 25. Export Quiz Results CSV
module.exports.exportQuizResultsCSV = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const attempts = await Attempt.find({ quizId: id, status: { $ne: 'in_progress' } }).populate('studentId', 'fullname email');

        let csv = 'Student Name,Email,Attempt #,Score,Max Marks,Percentage,Status,Submitted At\n';
        attempts.forEach(a => {
            csv += `"${a.studentId?.fullname || 'Unknown'}","${a.studentId?.email || ''}",${a.attemptNumber},${a.score},${quiz.totalMarks},${a.percentage}%,${a.status},"${a.submittedAt ? new Date(a.submittedAt).toISOString() : ''}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${quiz.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 26. Get Student Attempts across all quizzes
module.exports.getStudentAttempts = async (req, res) => {
    try {
        const { roomId } = req.query;
        let filter = { studentId: req.user._id };
        if (roomId && roomId !== 'all') filter.roomId = roomId;

        const attempts = await Attempt.find(filter)
            .populate('quizId', 'title topic totalMarks deadline isPublished showResultsImmediately resultVisibility')
            .sort({ createdAt: -1 });

        res.json({ success: true, attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
