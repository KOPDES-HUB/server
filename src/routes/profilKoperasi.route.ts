import express from "express";
import ProfilKoperasiController from "../controllers/profilKoperasi.controller";

const router = express.Router();

router.get("/", ProfilKoperasiController.getAll);

router.get(
  "/pagination",
  ProfilKoperasiController.getPagination,
);

router.get(
  "/:koperasi_ref",
  ProfilKoperasiController.getById,
);

router.post(
  "/",
  ProfilKoperasiController.create,
);

router.put(
  "/:koperasi_ref",
  ProfilKoperasiController.edit,
);

router.post(
  "/check-location",
  ProfilKoperasiController.checkLocation,
);

export default router;