const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB for video recording chunks
const { protect } = require("../middleware/authMiddleware");
const liveSessionController = require("../controllers/liveSessionController");

router.use(protect);

// Session Lifecycle
router.post("/", liveSessionController.createLiveSession);
router.post("/rooms/:roomId", liveSessionController.createLiveSession);
router.get("/rooms/:roomId/current", liveSessionController.getCurrentLiveSession);
router.get("/rooms/:roomId/history", liveSessionController.getLiveSessionHistory);

router.get("/:sessionId", liveSessionController.getLiveSessionById);
router.post("/:sessionId/start", liveSessionController.startLiveSession);
router.post("/:sessionId/end", liveSessionController.endLiveSession);
router.post("/:sessionId/join", liveSessionController.joinLiveSession);
router.post("/:sessionId/leave", liveSessionController.leaveLiveSession);

// Moderation & Whiteboard Permissions
router.post("/:sessionId/kick/:userId", liveSessionController.kickParticipant);
router.post("/:sessionId/whiteboard-permission", liveSessionController.toggleWhiteboardPermission);
router.post("/:sessionId/whiteboard", liveSessionController.saveWhiteboardState);

// Live Attendance & Recordings
router.get("/:sessionId/attendance", liveSessionController.getLiveAttendance);
router.post("/:sessionId/recording", upload.any(), liveSessionController.attachRecording);

module.exports = router;
