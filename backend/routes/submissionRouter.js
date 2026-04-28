const express = require("express");
const router = express.Router();
const { submitAssignment, getSubmissionsForTask, getStudentSubmissions, gradeSubmission } = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post("/:taskId", submitAssignment);
router.post("/:taskId/upload", upload.single('file'), require("../controllers/submissionController").uploadFile);
router.get("/task/:taskId", getSubmissionsForTask);
router.get("/me", getStudentSubmissions);
router.put("/:id/grade", gradeSubmission);

module.exports = router;
