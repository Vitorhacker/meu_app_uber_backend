// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  registerPassenger,
  loginPassenger,
  getProfile,
  logout,
} = require("../controllers/authController");

const { verifyToken } = require("../middlewares/authMiddleware");

// ==========================
// 🧭 DEPURAÇÃO / LOGS
// ==========================
router.use((req, res, next) => {
  console.log(`📡 [AUTH] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================
// 📍 REGISTRO DE PASSAGEIRO
// ==========================
router.post("/register", async (req, res, next) => {
  console.log("🚀 Rota /auth/register chamada com body:", req.body);
  try {
    await registerPassenger(req, res);
  } catch (err) {
    console.error("❌ Erro interno em /auth/register:", err);
    res.status(500).json({ error: "Erro interno no registro" });
  }
});

// ==========================
// 📍 LOGIN DE PASSAGEIRO
// ==========================
router.post("/login", async (req, res, next) => {
  console.log("🔑 Rota /auth/login chamada com body:", req.body);
  try {
    await loginPassenger(req, res);
  } catch (err) {
    console.error("❌ Erro interno em /auth/login:", err);
    res.status(500).json({ error: "Erro interno no login" });
  }
});

// ==========================
// 📍 PERFIL DO USUÁRIO (requer token)
// ==========================
router.get("/profile", verifyToken, async (req, res) => {
  console.log("👤 Rota /auth/profile chamada por:", req.user);
  try {
    await getProfile(req, res);
  } catch (err) {
    console.error("❌ Erro interno em /auth/profile:", err);
    res.status(500).json({ error: "Erro interno ao obter perfil" });
  }
});

// ==========================
// 📍 LOGOUT
// ==========================
router.post("/logout", verifyToken, async (req, res) => {
  console.log("🚪 Rota /auth/logout chamada por:", req.user);
  try {
    await logout(req, res);
  } catch (err) {
    console.error("❌ Erro interno em /auth/logout:", err);
    res.status(500).json({ error: "Erro interno ao realizar logout" });
  }
});

// ==========================
// 📍 ROTA TESTE
// ==========================
router.get("/", (req, res) => {
  res.json({ message: "✅ Rotas de autenticação ativas e funcionando" });
});

module.exports = router;
