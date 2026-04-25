const Quiz = require('../models/quiz-model');
const Question = require('../models/question-model');
const Attempt = require('../models/attempt-model');

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
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            marks: q.marks
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
        if (req.user.role === 'student') {
            filter.isPublished = true;
        }

        const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
        
        // For students, fetch attempt status
        let quizzesWithStatus = quizzes;
        if (req.user.role === 'student') {
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
        if (req.user.role === 'student') {
            const safeQuestions = questions.map(q => ({
                _id: q._id,
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
        if (req.user.role !== 'student') return res.status(403).json({ message: "Only students can attempt quizzes." });

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
        const processedAnswers = [];

        for (let userAns of answers) {
            const question = questions.find(q => q._id.toString() === userAns.questionId);
            if (question) {
                if (question.correctAnswer === userAns.selectedOption) {
                    score += question.marks;
                }
                processedAnswers.push({
                    questionId: question._id,
                    selectedOption: userAns.selectedOption
                });
            }
        }

        const attempt = await Attempt.create({
            quizId: id,
            studentId: req.user._id,
            roomId: quiz.roomId,
            answers: processedAnswers,
            score
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
        if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
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

        const totalAttempts = attempts.length;
        const averageScore = totalAttempts > 0 
            ? attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts 
            : 0;

        res.json({ 
            success: true, 
            analytics: { totalAttempts, averageScore },
            attempts 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
