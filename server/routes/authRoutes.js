import express from "express";
import upload from "../middlewares/multerConfig.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController.js";

const router = express.Router();

// Send signup OTP
router.post("/register", upload.single("profileImage"), registerUser);
// Verify signup OTP
router.post("/verify-email", verifyEmail);
// Existing login and password routes
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;