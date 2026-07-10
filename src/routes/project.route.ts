import express from "express";
import ProjectController from "../controllers/project.controller";

const router = express.Router();

router.get("/all", ProjectController.getAll);
router.get("/", ProjectController.getByPagination);
router.get("/:id", ProjectController.getById);
router.post("/", ProjectController.create);
router.put("/:id", ProjectController.update);
router.delete("/:id", ProjectController.delete);

export default router;
