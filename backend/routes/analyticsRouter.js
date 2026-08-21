const express = require("express");
const router = express.Router();
const {
    getStudentAnalytics,
    getClassroomAnalytics,
    exportClassroomAnalyticsCSV,
    getStudentMastery
} = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

// All analytics routes require authentication
router.use(protect);

// Student Analytics Routes
router.get("/student", getStudentAnalytics);
router.get("/student/classroom/:roomId", getStudentAnalytics);
router.get("/student/:id/mastery", getStudentMastery);

// Teacher Classroom Analytics Routes
router.get("/class/:roomId", getClassroomAnalytics);
router.get("/class/:roomId/export", exportClassroomAnalyticsCSV);

module.exports = router;
