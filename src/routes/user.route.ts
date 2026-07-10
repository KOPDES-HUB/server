import express from "express";
import UserController from "../controllers/user.controller";
const router = express.Router();

router.get("/", UserController.getAll);
router.get("/pagination", UserController.getByPagination);
router.get("/pegawai", UserController.getPegawai);
router.get("/admin", UserController.getAdmin);
router.get("/directory", UserController.getDirectory);
router.get("/:id", UserController.getById);
router.post("/", UserController.create);
router.put("/:id", UserController.edit);
router.delete("/:id", UserController.delete);

export default router;
