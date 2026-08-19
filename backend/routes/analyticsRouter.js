const express = require("express");
const router = express.Router();
const { getStudentMastery } = require("../controllers/analyticsController");

// Mastery Aggregation Analytics Route
router.get("/student/:id/mastery", getStudentMastery);

module.exports = router;
