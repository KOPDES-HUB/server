import express from "express";
import ReferensiWilayahController from "../controllers/referensiWilayah.controller";

const router = express.Router();

router.get("/", ReferensiWilayahController.getAll);
router.get("/pagination", ReferensiWilayahController.getByPagination);
router.get("/:id", ReferensiWilayahController.getById);
router.post("/", ReferensiWilayahController.create);
router.put("/:id", ReferensiWilayahController.update);
router.delete("/:id", ReferensiWilayahController.delete);

export default router;
