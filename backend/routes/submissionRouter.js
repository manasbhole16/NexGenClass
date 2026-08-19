const express = require("express");
const router = express.Router();
const { submitAssignment, getSubmissionsForTask, getStudentSubmissions, gradeSubmission, uploadFile } = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");
const multer = require('multer');

router.use(protect);

// Setup multer storage for Vercel Serverless (memory instead of disk)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 8 * 1024 * 1024 } // 8MB per file limit
});

router.post("/:taskId", submitAssignment);
router.post("/:taskId/upload", upload.any(), uploadFile);
router.get("/task/:taskId", getSubmissionsForTask);
router.get("/me", getStudentSubmissions);
router.put("/:id/grade", gradeSubmission);
router.post("/:id/grade", gradeSubmission);
router.post("/grade/:id", gradeSubmission);
router.put("/grade/:id", gradeSubmission);

module.exports = router;
