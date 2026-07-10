import express from "express";
import SimpananAnggotaController from "../controllers/simpananAnggota.controller";

const router = express.Router();

router.get("/", SimpananAnggotaController.getAll);
router.get("/pagination", SimpananAnggotaController.getByPagination);
router.get("/:id", SimpananAnggotaController.getById);
router.post("/", SimpananAnggotaController.create);
router.put("/:id", SimpananAnggotaController.update);
router.delete("/:id", SimpananAnggotaController.delete);

export default router;
