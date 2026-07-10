import express from "express";
import ActivityController from "../controllers/activity.controller";

const router = express.Router();

router.get("/export", ActivityController.exportEmployeeActivities);
router.get("/", ActivityController.getEmployeeActivities);

export default router;
