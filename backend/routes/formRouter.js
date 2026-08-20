const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const formController = require('../controllers/formController');
const formResponseController = require('../controllers/formResponseController');

// Setup multer in-memory storage for serverless-safe uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Unprotected or Optional Auth Route for Shared Links
router.get('/shared/:token', optionalAuth || ((req, res, next) => next()), formController.getSharedFormByToken);

// All other form routes are protected
router.use(protect);

// Form CRUD
router.post('/', formController.createForm);
router.get('/room/:roomId', formController.getFormsByRoom);
router.get('/:id', formController.getFormById);
router.put('/:id', formController.updateForm);
router.delete('/:id', formController.deleteForm);

// Questions management
router.post('/:id/questions', formController.saveQuestions);
router.put('/:id/questions', formController.saveQuestions);

// Publishing & Lifecycle
router.post('/:id/publish', formController.publishForm);
router.post('/:id/close', formController.closeForm);
router.post('/:id/archive', formController.archiveForm);
router.post('/:id/unarchive', formController.unarchiveForm);

// Advanced Form Operations: Duplicate & Templates
router.post('/:id/duplicate', formController.duplicateForm);
router.post('/:id/template', formController.createTemplate);
router.post('/:id/from-template', formController.createFromTemplate);

// File Upload for Form Media / Question Uploads
router.post('/:id/upload', upload.single('file'), formController.uploadQuestionFile);

// Phase 6: Form Collaborators
router.get('/:id/collaborators', formController.getCollaborators);
router.post('/:id/collaborators', formController.addCollaborator);
router.put('/:id/collaborators/:collaboratorId', formController.updateCollaborator);
router.delete('/:id/collaborators/:collaboratorId', formController.removeCollaborator);

// Phase 6: Selected Student Access List
router.get('/:id/access', formController.getFormAccess);
router.post('/:id/access', formController.grantFormAccess);
router.delete('/:id/access/:userId', formController.revokeFormAccess);

// Phase 6: Secure Share Links & Sharing Settings
router.post('/:id/share-link', formController.generateShareLink);
router.post('/:id/revoke-share-link', formController.revokeShareLink);
router.post('/:id/regenerate-share-link', formController.regenerateShareLink);
router.put('/:id/sharing', formController.updateSharingSettings);

// Phase 6: Form Audit Logs
router.get('/:id/audit-logs', formController.getFormAuditLogs);

// Student Response Endpoints
router.post('/:id/responses', formResponseController.submitResponse);
router.post('/:id/draft', formResponseController.saveDraft);
router.get('/:id/draft', formResponseController.getMyDraft);
router.get('/:id/my-response', formResponseController.getMyResponse);
router.put('/:id/responses/:responseId', formResponseController.editResponse);
router.get('/:id/responses/:responseId/result', formResponseController.getStudentResult);

// Teacher Response, Moderation, Grading & Analytics Endpoints
router.get('/:id/responses', formResponseController.getFormResponses);
router.get('/:id/responses/:responseId', formResponseController.getIndividualResponse);
router.put('/:id/responses/:responseId/moderate', formResponseController.moderateResponse);
router.post('/:id/responses/bulk-moderate', formResponseController.bulkModerateResponses);
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
