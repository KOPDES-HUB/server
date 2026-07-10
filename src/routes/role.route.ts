import express from "express";
import RoleController from "./../controllers/role.controller";
const router = express.Router();

router.get("/", RoleController.getAll);
router.get("/pagination", RoleController.getByPagination);
router.get("/:id/detail", RoleController.getById);
router.post("/", RoleController.create);
router.put("/:id", RoleController.edit);
router.delete("/:id", RoleController.delete);
router.get("/:id/permissions", RoleController.getPermissions);
router.post("/:id/permissions/toggle", RoleController.togglePermission);
router.patch("/:id/permissions/crud", RoleController.toggleCrud);

export default router;
