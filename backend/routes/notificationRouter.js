const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("../middleware/rateLimit");
const notificationController = require("../controllers/notificationController");

// Machine-to-machine scheduler endpoint (secret-protected, registered before user auth).
router.post("/internal/run-scheduled", notificationController.runScheduledJobs);

router.use(protect);
router.use(rateLimit({ windowMs: 60_000, max: 240 }));

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.get("/preferences", notificationController.getPreferences);
router.put("/preferences", notificationController.updatePreferences);
router.patch("/preferences", notificationController.updatePreferences);

router.post("/read-all", notificationController.markAllAsRead);
router.put("/read-all", notificationController.markAllAsRead);
router.patch("/read-all", notificationController.markAllAsRead);

router.delete("/clear-read", notificationController.clearReadNotifications);
router.delete("/clear-all", notificationController.clearAllNotifications);
router.delete("/", notificationController.clearAllNotifications);

router.post("/:id/read", notificationController.markAsRead);
router.put("/:id/read", notificationController.markAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
