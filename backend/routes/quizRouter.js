const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const quizController = require('../controllers/quizController');

// All quiz routes are protected
router.use(protect);

router.post('/create', quizController.createQuiz);
router.post('/:id/questions', quizController.addQuestions);
router.post('/:id/publish', quizController.publishQuiz);
router.get('/room/:roomId', quizController.getQuizzesByRoom);
router.get('/:id', quizController.getQuizDetails);
router.post('/:id/attempt', quizController.attemptQuiz);
router.get('/:id/result/:studentId', quizController.getStudentResult);
router.get('/:id/results', quizController.getQuizResults);

module.exports = router;
