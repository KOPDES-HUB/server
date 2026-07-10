import express from "express";
import ReferensiKoperasiWilayahController from "../controllers/referensiKoperasiWilayah.controller";

const router = express.Router();

router.get("/", ReferensiKoperasiWilayahController.getAll);
router.get("/pagination", ReferensiKoperasiWilayahController.getByPagination);
router.get("/:id", ReferensiKoperasiWilayahController.getById);
router.post("/", ReferensiKoperasiWilayahController.create);
router.put("/:id", ReferensiKoperasiWilayahController.update);
router.delete("/:id", ReferensiKoperasiWilayahController.delete);

export default router;
