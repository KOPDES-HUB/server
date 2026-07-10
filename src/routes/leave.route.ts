import express from "express";
import LeaveController from "../controllers/leave.controller";

const router = express.Router();

router.get("/", LeaveController.getAll);
router.post("/", LeaveController.create);
router.patch("/:id/status", LeaveController.updateStatus);

export default router;
