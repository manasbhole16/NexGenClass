const express = require("express");
const router = express.Router();
const { 
    markAttendance, 
    getRoomSessions,
    getAttendanceByDate, 
    updateSession,
    deleteSession,
    getRoomAttendanceReport, 
    getRoomAttendanceStats,
    getStudentAttendance,
    exportAttendanceCSV
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// Student route
router.get("/student", getStudentAttendance);

// Teacher & Classroom routes
router.post("/", markAttendance);
router.get("/room/:roomId/sessions", getRoomSessions);
router.get("/room/:roomId/date/:date", getAttendanceByDate);
router.get("/room/:roomId/report", getRoomAttendanceReport);
router.get("/room/:roomId/stats", getRoomAttendanceStats);
router.get("/room/:roomId/export", exportAttendanceCSV);
router.put("/session/:id", updateSession);
router.delete("/session/:id", deleteSession);

module.exports = router;
