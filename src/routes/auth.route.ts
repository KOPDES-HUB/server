import express from "express";
import AuthController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate.middleware";
import { withAvatarUpload } from "../middlewares/upload.middleware";
const router = express.Router();

router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.get("/me", authenticate, AuthController.getMe);

router.post("/change-password", authenticate, AuthController.changePassword);
router.put("/profile", authenticate, withAvatarUpload, AuthController.updateProfile);

export default router;
