import express from "express";
import KaryawanKoperasiController from "../controllers/karyawanKoperasi.controller";

const router = express.Router();

router.get("/", KaryawanKoperasiController.getAll);
router.get("/pagination", KaryawanKoperasiController.getByPagination);
router.get("/:id", KaryawanKoperasiController.getById);
router.post("/", KaryawanKoperasiController.create);
router.put("/:id", KaryawanKoperasiController.update);
router.delete("/:id", KaryawanKoperasiController.delete);

export default router;
