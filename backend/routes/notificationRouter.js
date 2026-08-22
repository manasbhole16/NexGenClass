const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// All notification routes are protected
router.use(protect);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.get("/preferences", notificationController.getPreferences);
router.put("/preferences", notificationController.updatePreferences);
router.patch("/preferences", notificationController.updatePreferences);

router.post("/:id/read", notificationController.markAsRead);
router.put("/:id/read", notificationController.markAsRead);
router.patch("/:id/read", notificationController.markAsRead);

router.post("/read-all", notificationController.markAllAsRead);
router.put("/read-all", notificationController.markAllAsRead);
router.patch("/read-all", notificationController.markAllAsRead);

router.delete("/clear-read", notificationController.clearReadNotifications);
router.delete("/clear-all", notificationController.clearAllNotifications);
router.delete("/", notificationController.clearAllNotifications);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
