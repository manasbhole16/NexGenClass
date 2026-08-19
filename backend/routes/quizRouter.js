const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const quizController = require('../controllers/quizController');

// All quiz routes are protected
router.use(protect);

router.post('/generate', quizController.generateQuizQuestions);
router.post('/create', quizController.createQuiz);
router.put('/:id', quizController.updateQuiz);
router.post('/:id/questions', quizController.addQuestions);
router.post('/:id/publish', quizController.publishQuiz);
router.get('/room/:roomId', quizController.getQuizzesByRoom);
router.get('/attempts/me', quizController.getStudentAttempts);
router.get('/:id', quizController.getQuizDetails);
router.post('/:id/start', quizController.startQuiz);
router.post('/:id/save-progress', quizController.saveProgress);
router.post('/:id/attempt', quizController.attemptQuiz);
router.get('/:id/my-attempts', quizController.getMyAttempts);
router.get('/:id/result', quizController.getStudentResult);
router.get('/:id/result/:studentId', quizController.getStudentResult);
router.get('/:id/results', quizController.getQuizResults);
router.get('/:id/analytics', quizController.getComprehensiveQuizAnalytics);
router.get('/:id/question-analytics', quizController.getQuestionLevelAnalytics);
router.get('/:id/student/:studentId/analytics', quizController.getStudentQuizAnalytics);
router.get('/:id/export/csv', quizController.exportQuizResultsCSV);
router.get('/:id/attempt/:attemptId', quizController.getAttemptDetail);
router.put('/:id/attempt/:attemptId/evaluate', quizController.evaluateAttempt);
router.post('/:id/attempt/:attemptId/evaluate', quizController.evaluateAttempt);
router.post('/:id/evaluate/:attemptId', quizController.evaluateAttempt);
router.delete('/:id', quizController.deleteQuiz);

module.exports = router;
