const express = require("express");
const router = express.Router();
const { markAttendance, getAttendanceByDate, getRoomAttendanceReport, getStudentAttendance } = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// Student route
router.get("/student", getStudentAttendance);

// Teacher routes
router.post("/", markAttendance);
router.get("/room/:roomId/date/:date", getAttendanceByDate);
router.get("/room/:roomId/report", getRoomAttendanceReport);

module.exports = router;
