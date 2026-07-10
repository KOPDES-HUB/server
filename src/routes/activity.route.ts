import express from "express";
import ActivityController from "../controllers/activity.controller";

const router = express.Router();

router.get("/export", ActivityController.exportMyActivities);
router.get("/all", ActivityController.getAll);
router.get("/", ActivityController.getByPagination);
router.get("/:id", ActivityController.getById);
router.post("/", ActivityController.create);
router.put("/:id", ActivityController.update);
router.delete("/:id", ActivityController.delete);

export default router;
