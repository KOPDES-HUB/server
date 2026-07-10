import express from "express";
import PermissionController from "../controllers/permission.controller";
const router = express.Router();

router.get("/", PermissionController.getAll);
router.get("/pagination", PermissionController.getByPagination);
router.get("/:id/detail", PermissionController.getById);
router.post("/", PermissionController.create);
router.put("/:id", PermissionController.edit);
router.delete("/:id", PermissionController.delete);

export default router;
