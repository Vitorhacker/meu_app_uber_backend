const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ======================
// PASSAGEIRO
// ======================
// Registro
router.post("/register", authController.registerPassenger);

// Login
router.post("/login", authController.loginPassenger);

// Perfil do usuário logado
router.get("/me", verifyToken, authController.getProfile);

// Logout
router.post("/logout", verifyToken, authController.logout);

module.exports = router;
