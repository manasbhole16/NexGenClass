const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    createLiveSession,
    startLiveSession,
    endLiveSession,
    joinLiveSession,
    leaveLiveSession,
    getCurrentLiveSession,
    getLiveSessionHistory
} = require("../controllers/liveSessionController");

router.use(protect);

router.post("/rooms/:roomId", createLiveSession);
router.get("/rooms/:roomId/current", getCurrentLiveSession);
router.get("/rooms/:roomId/history", getLiveSessionHistory);
router.post("/:sessionId/start", startLiveSession);
router.post("/:sessionId/end", endLiveSession);
router.post("/:sessionId/join", joinLiveSession);
router.post("/:sessionId/leave", leaveLiveSession);

module.exports = router;
