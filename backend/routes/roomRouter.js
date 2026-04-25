const express = require("express");
const router = express.Router();
const { createRoom, joinRoom, getUserRooms, deleteRoom, kickMember } = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/create", createRoom);
router.post("/join", joinRoom);
router.get("/my-rooms", getUserRooms);
router.delete("/delete/:roomId", deleteRoom);
router.post("/kick", kickMember);

module.exports = router;
