import express from "express";
import AssignmentController from "../controllers/assignment.controller";
import { requireAdminOrSuperadmin } from "../middlewares/checkSuperadmin.middleware";

const router = express.Router();

router.get("/export", AssignmentController.exportAssignments);
router.get("/report", requireAdminOrSuperadmin, AssignmentController.getReportByPagination);
router.get("/report/export", requireAdminOrSuperadmin, AssignmentController.exportReportAssignments);
router.get("/all", AssignmentController.getAll);
router.get("/", AssignmentController.getByPagination);
router.get("/:id", AssignmentController.getById);
router.post("/", AssignmentController.create);
router.put("/:id", AssignmentController.update);
router.delete("/:id", AssignmentController.delete);

export default router;
