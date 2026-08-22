const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const quizController = require('../controllers/quizController');

// All quiz routes are protected
router.use(protect);

// AI Question Generation
router.post('/generate', quizController.generateQuizQuestions);

// Question Bank Endpoints
router.get('/bank/questions', quizController.getQuestionBank);
router.post('/bank/questions', quizController.saveToQuestionBank);

// CRUD Quiz
router.post('/create', quizController.createQuiz);
router.put('/:id', quizController.updateQuiz);
router.post('/:id/questions', quizController.addQuestions);
router.post('/:id/import-questions', quizController.importQuestionsFromBank);
router.post('/:id/publish', quizController.publishQuiz);
router.post('/:id/release-results', quizController.releaseResults);
router.get('/room/:roomId', quizController.getQuizzesByRoom);
router.get('/attempts/me', quizController.getStudentAttempts);
router.get('/:id', quizController.getQuizDetails);

// Student Exam Flow & Safe Mode Telemetry
router.post('/:id/start', quizController.startQuiz);
router.post('/:id/save-progress', quizController.saveProgress);
router.post('/:id/log-event', quizController.logSuspiciousEvent);
router.post('/:id/attempt', quizController.attemptQuiz);
router.get('/:id/my-attempts', quizController.getMyAttempts);
router.get('/:id/result', quizController.getStudentResult);
router.get('/:id/result/:studentId', quizController.getStudentResult);

// Teacher Evaluation & Analytics
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
