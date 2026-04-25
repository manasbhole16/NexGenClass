const express = require("express");
const router = express.Router();
const { getChatHistory, clearChat } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:roomId", protect, getChatHistory);
router.delete("/clear/:roomId", protect, clearChat);

module.exports = router;
