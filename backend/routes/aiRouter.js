const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// All AI routes require authentication
router.use(protect);

// AI Health
router.get("/health", aiController.getAIHealth);

// Document Intelligence
router.post("/summarize", aiController.summarizeDocument);
router.post("/ask", aiController.askDocumentQuestion);

// Study Tools (Student & Teacher)
router.post("/study-guide", aiController.generateStudyGuide);
router.post("/study-plan", aiController.generateStudyPlan);
router.post("/performance-insights", aiController.getPerformanceInsights);

// Teacher Copilot Tools (Instructors only)
router.post("/generate-questions", aiController.generateQuizQuestions);
router.post("/generate-rubric", aiController.generateRubric);
router.post("/generate-task-draft", aiController.generateTaskDraft);

// AI Conversation History
router.post("/conversations", aiController.createConversation);
router.get("/conversations", aiController.getConversations);
router.get("/conversations/:id", aiController.getConversationById);
router.post("/conversations/:id/messages", aiController.sendMessage);
router.delete("/conversations/:id", aiController.deleteConversation);

module.exports = router;
