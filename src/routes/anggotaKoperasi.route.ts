import express from "express";
import AnggotaKoperasiController from "../controllers/anggotaKoperasi.controller";

const router = express.Router();

router.get("/", AnggotaKoperasiController.getAll);
router.get("/pagination", AnggotaKoperasiController.getByPagination);
router.get("/:id", AnggotaKoperasiController.getById);
router.post("/", AnggotaKoperasiController.create);
router.put("/:id", AnggotaKoperasiController.update);
router.delete("/:id", AnggotaKoperasiController.delete);

export default router;