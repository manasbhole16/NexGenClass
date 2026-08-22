const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const plagiarismController = require("../controllers/plagiarismController");

router.use(protect);

// Submissions
router.post("/submissions/:submissionId/analyze", plagiarismController.analyzeSubmission);
router.get("/submissions/:submissionId", plagiarismController.getSubmissionReport);

// Task-wide
router.get("/tasks/:taskId", plagiarismController.getTaskPlagiarismOverview);
router.get("/tasks/:taskId/report", plagiarismController.getTaskPlagiarismOverview);
router.post("/tasks/:taskId/analyze", plagiarismController.analyzeTaskSubmissions);
router.get("/tasks/:taskId/export", plagiarismController.exportTaskCSV);

// Reviews
router.post("/reports/:reportId/review", plagiarismController.reviewReport);

module.exports = router;
