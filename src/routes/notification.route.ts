import express from "express";
import NotificationController from "../controllers/notification.controller";

const router = express.Router();

router.get("/", NotificationController.getMyNotifications);
router.patch("/mark-all", NotificationController.markAllAsRead);
router.patch("/:id/read", NotificationController.markAsRead);

export default router;
