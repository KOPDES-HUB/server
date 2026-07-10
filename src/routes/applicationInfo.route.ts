import express from "express";
import ApplicationInfoController from "../controllers/applicationInfo.controller";
import { requireSuperadmin } from "../middlewares/checkSuperadmin.middleware";
import { withApplicationFilesUpload } from "../middlewares/upload.middleware";

const router = express.Router();

// Enforce Superadmin access for all endpoints in this route
router.use(requireSuperadmin);

router.get("/", ApplicationInfoController.getByPagination);
router.get("/:id", ApplicationInfoController.getById);
router.post("/", withApplicationFilesUpload, ApplicationInfoController.create);
router.put(
  "/:id",
  withApplicationFilesUpload,
  ApplicationInfoController.update,
);
router.delete("/:id", ApplicationInfoController.delete);
router.delete("/files/:fileId", ApplicationInfoController.deleteFile);

export default router;
