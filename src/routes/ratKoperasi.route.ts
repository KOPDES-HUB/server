import express from "express";
import RatKoperasiController from "../controllers/ratKoperasi.controller";

const router = express.Router();

router.get("/", RatKoperasiController.getAll);
router.get("/pagination", RatKoperasiController.getByPagination);
router.get("/:id", RatKoperasiController.getById);
router.post("/", RatKoperasiController.create);
router.put("/:id", RatKoperasiController.update);
router.delete("/:id", RatKoperasiController.delete);

export default router;
