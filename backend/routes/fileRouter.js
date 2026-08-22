const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const fileController = require("../controllers/fileController");
const { MAX_FILE_SIZE_BYTES } = require("../utils/fileValidation");

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES }
});

router.use(protect);

router.post("/upload", upload.any(), fileController.uploadFiles);
router.post("/external-link", fileController.addExternalLink);
router.get("/", fileController.getFiles);
router.get("/:id", fileController.getFileById);
router.get("/:id/preview", fileController.previewFile);
router.get("/:id/download", fileController.downloadFile);
router.put("/:id", fileController.updateFile);
router.patch("/:id", fileController.updateFile);
router.delete("/:id", fileController.deleteFile);
router.post("/:id/reuse", fileController.reuseResource);

module.exports = router;
