const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const formController = require('../controllers/formController');
const formResponseController = require('../controllers/formResponseController');

// All form routes are protected
router.use(protect);

router.post('/', formController.createForm);
router.get('/room/:roomId', formController.getFormsByRoom);
router.get('/:id', formController.getFormById);
router.put('/:id', formController.updateForm);
router.delete('/:id', formController.deleteForm);

// Questions management
router.post('/:id/questions', formController.saveQuestions);
router.put('/:id/questions', formController.saveQuestions);

// Publishing lifecycle
router.post('/:id/publish', formController.publishForm);

// Student Response Endpoints
router.post('/:id/responses', formResponseController.submitResponse);
router.get('/:id/my-response', formResponseController.getMyResponse);
router.put('/:id/responses/:responseId', formResponseController.editResponse);
router.get('/:id/responses/:responseId/result', formResponseController.getStudentResult);

// Teacher Response, Grading & Analytics Endpoints
router.get('/:id/responses', formResponseController.getFormResponses);
router.get('/:id/responses/:responseId', formResponseController.getIndividualResponse);
router.post('/:id/responses/:responseId/grade', formResponseController.gradeResponse);
router.put('/:id/responses/:responseId/grade', formResponseController.gradeResponse);
router.get('/:id/response-status', formResponseController.getResponseStatus);

// Analytics & Reports
router.get('/:id/analytics', formResponseController.getFormAnalytics);
router.get('/:id/question-analytics', formResponseController.getQuestionAnalytics);

// Exports
router.get('/:id/export/csv', formResponseController.exportCSV);
router.get('/:id/export/xlsx', formResponseController.exportXLSX);

module.exports = router;

