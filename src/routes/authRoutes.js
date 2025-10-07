// routes/authRouter.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// ======================================================
// 🔹 Registrar passageiro
// POST /api/auth/register
// ======================================================
router.post("/register", async (req, res) => {
  console.log("📤 Requisição recebida para registro de passageiro:", req.body);
  try {
    await authController.register(req, res);
  } catch (err) {
    console.error("❌ Erro na rota /register:", err);
    res.status(500).json({ error: "Erro interno no registro", details: err.message });
  }
});

// ======================================================
// 🔹 Login de passageiro
// POST /api/auth/login
// ======================================================
router.post("/login", async (req, res) => {
  console.log("📤 Requisição recebida para login de passageiro:", req.body.email);
  try {
    await authController.login(req, res);
  } catch (err) {
    console.error("❌ Erro na rota /login:", err);
    res.status(500).json({ error: "Erro interno no login", details: err.message });
  }
});

// ======================================================
// 🔹 Obter perfil do usuário logado
// GET /api/auth/profile
// ======================================================
router.get("/profile", async (req, res) => {
  console.log("📤 Requisição recebida para obter perfil do usuário");
  try {
    await authController.profile(req, res);
  } catch (err) {
    console.error("❌ Erro na rota /profile:", err);
    res.status(500).json({ error: "Erro interno ao buscar perfil", details: err.message });
  }
});

module.exports = router;
