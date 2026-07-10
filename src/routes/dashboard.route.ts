import express from "express";
import DashboardController from "../controllers/dashboard.controller";

const router = express.Router();

router.get("/recap", DashboardController.getEmployeeRecap);
router.get("/calendar", DashboardController.getCalendarEvents);
router.get("/analytics", DashboardController.getAnalytics);
router.get("/execution", DashboardController.getProjectExecution);

export default router;
