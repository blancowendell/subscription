const express = require("express");
const router = express.Router();

const {
  requireClient,
  signUp,
  verifyEmail,
  resendVerification,
  login,
  logout,
  session,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../../controller/public/clientAuth.controller");

router.post("/sign-up", signUp);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.post("/logout", logout);
router.get("/session", session);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", requireClient, changePassword);

module.exports = router;