const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// All notification routes are protected
router.use(protect);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/:id/read", notificationController.markAsRead);
router.put("/:id/read", notificationController.markAsRead);
router.post("/read-all", notificationController.markAllAsRead);
router.put("/read-all", notificationController.markAllAsRead);
router.delete("/clear-read", notificationController.clearReadNotifications);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
