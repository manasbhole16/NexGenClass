const express = require("express");
const router = express.Router();
const { submitAssignment, getSubmissionsForTask, getStudentSubmissions, gradeSubmission } = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/:taskId", submitAssignment);
router.get("/task/:taskId", getSubmissionsForTask);
router.get("/me", getStudentSubmissions);
router.put("/:id/grade", gradeSubmission);

module.exports = router;
