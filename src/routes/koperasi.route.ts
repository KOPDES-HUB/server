import express from "express";
import KoperasiController from "../controllers/koperasi.controller";

const router = express.Router();

router.get(
  "/:koperasi_ref/informasi",
  KoperasiController.getInformasiByKoperasiRef,
);

export default router;
