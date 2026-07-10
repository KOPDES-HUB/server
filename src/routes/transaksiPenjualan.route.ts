import express from "express";
import TransaksiPenjualanController from "../controllers/transaksiPenjualan.controller";

const router = express.Router();

router.get("/", TransaksiPenjualanController.getAll);
router.get("/pagination", TransaksiPenjualanController.getByPagination);
router.get(
  "/koperasi/:koperasi_ref/tren-penjualan",
  TransaksiPenjualanController.getTrenPenjualanByKoperasi,
);
router.get(
  "/koperasi/:koperasi_ref/arus-kas-npv",
  TransaksiPenjualanController.getArusKasDanNPV,
);
router.get("/:id", TransaksiPenjualanController.getById);
router.post("/", TransaksiPenjualanController.create);
router.put("/:id", TransaksiPenjualanController.update);
router.delete("/:id", TransaksiPenjualanController.delete);

export default router;
