const express = require("express");
const router = express.Router({ mergeParams: true });
const {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addComment,
    deleteComment
} = require("../controllers/announcementController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getAnnouncements);
router.post("/", createAnnouncement);
router.put("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);
router.post("/:id/comments", addComment);
router.delete("/:id/comments/:commentId", deleteComment);

module.exports = router;
