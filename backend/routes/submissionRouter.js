const express = require("express");
const router = express.Router();
const { submitAssignment, getSubmissionsForTask, getStudentSubmissions, gradeSubmission } = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Setup multer storage for Vercel Serverless (memory instead of disk)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 8 * 1024 * 1024 } // 8MB limit to fit well within MongoDB 16MB doc limit
});

router.post("/:taskId", submitAssignment);
router.post("/:taskId/upload", upload.single('file'), require("../controllers/submissionController").uploadFile);
router.get("/task/:taskId", getSubmissionsForTask);
router.get("/me", getStudentSubmissions);
router.put("/:id/grade", gradeSubmission);

module.exports = router;
