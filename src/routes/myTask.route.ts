import express from "express";
import MyTaskController from "../controllers/myTask.controller";

const router = express.Router();

router.get("/", MyTaskController.getMyTasksByPagination);
router.get("/all", MyTaskController.getMyTasks);
router.get("/:id", MyTaskController.getTaskDetail);
router.patch("/:id/status", MyTaskController.updateStatus);

export default router;
