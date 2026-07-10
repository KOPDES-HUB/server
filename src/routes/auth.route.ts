import express from "express";
import AuthController from "../controllers/auth.controller";
import {
  register,
  approveRegistration,
  rejectRegistration,
} from "../controllers/register.controller";
import { authenticate } from "../middlewares/authenticate.middleware";
import { withAvatarUpload } from "../middlewares/upload.middleware";
const router = express.Router();

router.post("/login", AuthController.login);
router.post("/register", register);
router.post("/refresh-token", AuthController.refreshToken);
router.get("/me", authenticate, AuthController.getMe);

router.post("/change-password", authenticate, AuthController.changePassword);
router.put("/profile", authenticate, withAvatarUpload, AuthController.updateProfile);

router.post("/register/:id/approve", authenticate, approveRegistration);
router.post("/register/:id/reject", authenticate, rejectRegistration);

export default router;
