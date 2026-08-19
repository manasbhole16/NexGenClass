const express = require("express");
const router = express.Router();
const {
    createAssessment,
    submitAssessment,
    getAssessmentById
} = require("../controllers/assessmentController");

// Assessment routes
router.post("/create", createAssessment);
router.post("/:id/submit", submitAssessment);
router.get("/:id", getAssessmentById);

module.exports = router;
