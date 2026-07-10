import express from "express";
import PengurusKoperasiController from "../controllers/pengurusKoperasi.controller";

const router = express.Router();

router.get("/", PengurusKoperasiController.getAll);
router.get("/pagination", PengurusKoperasiController.getByPagination);
router.get("/:id", PengurusKoperasiController.getById);
router.post("/", PengurusKoperasiController.create);
router.put("/:id", PengurusKoperasiController.update);
router.delete("/:id", PengurusKoperasiController.delete);

export default router;
