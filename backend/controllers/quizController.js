const Quiz = require('../models/quiz-model');
const Question = require('../models/question-model');
const Attempt = require('../models/attempt-model');
const { isAiConfigured } = require("../utils/aiClient");
const { generateQuizQuestionsFromNotes } = require("../services/aiGeneration");

// Create a new Quiz
module.exports.createQuiz = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can create quizzes." });
        
        const { title, description, roomId, timeLimit, totalMarks, deadline } = req.body;
        
        if (!title || !roomId || !timeLimit || !totalMarks || !deadline) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const quiz = await Quiz.create({
            title,
            description,
            roomId,
            createdBy: req.user._id,
            timeLimit,
            totalMarks,
            deadline
        });

        res.status(201).json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add questions to a quiz
module.exports.addQuestions = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can add questions." });

        const { id } = req.params; // quizId
        const { questions } = req.body; // array of questions

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if (quiz.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized to modify this quiz." });

        const formattedQuestions = questions.map(q => ({
            quizId: id,
            type: q.type || 'mcq',
            questionText: q.questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            referenceAnswer: q.referenceAnswer,
            marks: q.marks,
            difficulty: q.difficulty,
            explanation: q.explanation
        }));

        await Question.insertMany(formattedQuestions);

        res.status(201).json({ success: true, message: "Questions added successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle Publish
module.exports.publishQuiz = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can publish quizzes." });

        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if (quiz.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized to modify this quiz." });

        quiz.isPublished = !quiz.isPublished;
        await quiz.save();

        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Quizzes by Room
module.exports.getQuizzesByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        
        let filter = { roomId };
        const userRole = (req.user.role || 'student').toLowerCase();
        if (userRole === 'student') {
            filter.isPublished = true;
        }

        const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
        
        // For students, fetch attempt status
        let quizzesWithStatus = quizzes;
        const userRole2 = (req.user.role || 'student').toLowerCase();
        if (userRole2 === 'student') {
            const attempts = await Attempt.find({ roomId, studentId: req.user._id });
            const attemptedQuizIds = attempts.map(a => a.quizId.toString());
            
            quizzesWithStatus = quizzes.map(q => ({
                ...q.toObject(),
                hasAttempted: attemptedQuizIds.includes(q._id.toString())
            }));
        }

        res.json({ success: true, quizzes: quizzesWithStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Quiz details (with questions)
module.exports.getQuizDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const questions = await Question.find({ quizId: id });

        // Strip correct answers if it's a student
        const userRole = (req.user.role || 'student').toLowerCase();
        if (userRole === 'student') {
            const safeQuestions = questions.map(q => ({
                _id: q._id,
                type: q.type,
                questionText: q.questionText,
                options: q.options,
                marks: q.marks
            }));
            return res.json({ success: true, quiz, questions: safeQuestions });
        }

        res.json({ success: true, quiz, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Attempt Quiz (Student submit)
module.exports.attemptQuiz = async (req, res) => {
    try {
        const userRole = (req.user?.role || 'student').toLowerCase();
        if (userRole !== 'student') {
            return res.status(403).json({ message: "Only students can attempt quizzes." });
        }

        const { id } = req.params;
        const { answers } = req.body; // e.g. [{questionId, selectedOption}]
        
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if (!quiz.isPublished) return res.status(400).json({ message: "Quiz not active" });
        if (new Date() > new Date(quiz.deadline)) return res.status(400).json({ message: "Deadline has passed" });

        const existingAttempt = await Attempt.findOne({ quizId: id, studentId: req.user._id });
        if (existingAttempt) return res.status(400).json({ message: "You have already attempted this quiz." });

        const questions = await Question.find({ quizId: id });
        
        let score = 0;
        let requiresManualEvaluation = false;
        const processedAnswers = [];

        for (let userAns of answers) {
            const question = questions.find(q => q._id.toString() === userAns.questionId);
            if (question) {
                if (question.type === 'short_answer') {
                    requiresManualEvaluation = true;
                    processedAnswers.push({
                        questionId: question._id,
                        textAnswer: userAns.textAnswer
                    });
                } else {
                    if (question.correctAnswer === userAns.selectedOption) {
                        score += question.marks;
                    }
                    processedAnswers.push({
                        questionId: question._id,
                        selectedOption: userAns.selectedOption
                    });
                }
            }
        }

        const attempt = await Attempt.create({
            quizId: id,
            studentId: req.user._id,
            roomId: quiz.roomId,
            answers: processedAnswers,
            score,
            isEvaluated: !requiresManualEvaluation
        });

        res.status(201).json({ success: true, attempt });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get specific student result
module.exports.getStudentResult = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        // Verify permissions
        const userRole = (req.user.role || 'student').toLowerCase();
        if (userRole === 'student' && req.user._id.toString() !== studentId) {
            return res.status(403).json({ message: "Unauthorized to view this result." });
        }

        const attempt = await Attempt.findOne({ quizId: id, studentId }).populate('studentId', 'fullname email');
        if (!attempt) return res.status(404).json({ message: "Attempt not found" });

        res.json({ success: true, attempt });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Teacher Results Overview
module.exports.getQuizResults = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can view aggregate results." });

        const { id } = req.params;
        const attempts = await Attempt.find({ quizId: id }).populate('studentId', 'fullname email').sort({ score: -1 });
        const questions = await Question.find({ quizId: id });

        const totalAttempts = attempts.length;
        const averageScore = totalAttempts > 0 
            ? attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts 
            : 0;

        res.json({ 
            success: true, 
            analytics: { totalAttempts, averageScore },
            attempts,
            questions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Evaluate Attempt (Teacher marking short answers)
module.exports.evaluateAttempt = async (req, res) => {
    try {
        if (req.user.role !== 'teacher') return res.status(403).json({ message: "Only teachers can evaluate attempts." });

        const { id, attemptId } = req.params;
        const { addedScore, teacherFeedback } = req.body;

        const attempt = await Attempt.findById(attemptId);
        if (!attempt || attempt.quizId.toString() !== id) {
            return res.status(404).json({ message: "Attempt not found" });
        }

        // Verify teacher owns the quiz
        const quiz = await Quiz.findById(id);
        if (quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to modify this quiz." });
        }

        attempt.score += addedScore || 0;
        attempt.teacherFeedback = teacherFeedback;
        attempt.isEvaluated = true;

        await attempt.save();

        res.json({ success: true, attempt });
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
