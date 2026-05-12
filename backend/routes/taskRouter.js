const express = require("express");
const router = express.Router();
const { createTask, getTasks, updateTask, deleteTask, generateTaskDraft } = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/generate", generateTaskDraft);

router.route("/")
    .get(getTasks)
    .post(createTask);

router.route("/:id")
    .put(updateTask)
    .delete(deleteTask);

module.exports = router;
