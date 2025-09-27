// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Registro e login não exigem token
router.post("/register", authController.register);
router.post("/login", authController.login);

// Confirmação de e-mail/código
router.post("/confirm", authController.confirm);

// Reenvio de código de confirmação
router.post("/resend-code", authController.resendCode);

module.exports = router;
