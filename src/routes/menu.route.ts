import express from "express";
import MenuController from "./../controllers/menu.controller";
const router = express.Router();

router.get("/", MenuController.getAll);
router.get("/pagination", MenuController.getByPagination);
router.get("/:id/detail", MenuController.getById);
router.post("/", MenuController.create);
router.put("/:id", MenuController.edit);
router.delete("/:id", MenuController.delete);

export default router;
