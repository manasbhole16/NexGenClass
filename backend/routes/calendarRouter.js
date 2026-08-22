const express = require("express");
const router = express.Router();
const {
    getCalendarEvents,
    getUpcomingAgenda,
    createPersonalTask,
    toggleTaskStatus
} = require("../controllers/calendarController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/events", getCalendarEvents);
router.get("/upcoming", getUpcomingAgenda);
router.post("/tasks", createPersonalTask);
router.patch("/tasks/:id/toggle", toggleTaskStatus);

module.exports = router;
