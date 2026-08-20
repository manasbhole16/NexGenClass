const express = require("express");
const router = express.Router();
const {
    createRoom,
    joinRoom,
    getUserRooms,
    getRoomById,
    updateRoom,
    getRoomSettings,
    updateRoomSettings,
    regenerateJoinCode,
    toggleJoinCode,
    deleteRoom,
    kickMember,
    unenrollRoom,
    getDashboardSummary,
    createTopic,
    renameTopic,
    deleteTopic,
    reorderTopics
} = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");
const announcementRouter = require("./announcementRouter");

router.use(protect);

// Specific routes first
router.get("/my-rooms", getUserRooms);
router.get("/dashboard/summary", getDashboardSummary);
router.post("/create", createRoom);
router.post("/join", joinRoom);
router.post("/kick", kickMember);
router.post("/unenroll", unenrollRoom);
router.delete("/delete/:roomId", deleteRoom);

// Mount stream announcements router
router.use("/:roomId/stream", announcementRouter);
router.use("/:roomId/announcements", announcementRouter);

// Topic management routes (Classwork 2.0)
router.post("/:roomId/topics", createTopic);
router.put("/:roomId/topics", renameTopic);
router.delete("/:roomId/topics", deleteTopic);
router.put("/:roomId/topics/reorder", reorderTopics);

// Parameterized classroom routes
router.get("/:roomId/settings", getRoomSettings);
router.put("/:roomId/settings", updateRoomSettings);
router.post("/:roomId/join-code/regenerate", regenerateJoinCode);
router.post("/:roomId/join-code/toggle", toggleJoinCode);
router.get("/:roomId", getRoomById);
router.put("/:roomId", updateRoom);

module.exports = router;
