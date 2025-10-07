const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// ======================================================
// 🔹 Registrar passageiro
// POST /api/auth/register
// ======================================================
router.post("/register", authController.register);

// ======================================================
// 🔹 Login de passageiro
// POST /api/auth/login
// ======================================================
router.post("/login", authController.login);

// ======================================================
// 🔹 Obter perfil do usuário logado
// GET /api/auth/profile
// ======================================================
router.get("/profile", authController.profile);

module.exports = router;
