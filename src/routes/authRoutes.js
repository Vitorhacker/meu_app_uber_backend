const express = require("express");
const router = express.Router();
const {
  registerPassenger,
  loginPassenger,
  getProfile,
  logout
} = require("../controllers/authController");

const { verifyToken } = require("../middlewares/authMiddleware");

// ==========================
// DEPURAÇÃO / LOGS
// ==========================
router.use((req, res, next) => {
  console.log(`📡 [AUTH] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================
// REGISTRO PASSAGEIRO
// ==========================
router.post("/register", async (req, res) => {
  console.log("🚀 Rota /auth/register chamada");
  await registerPassenger(req, res);
});

// ==========================
// LOGIN PASSAGEIRO
// ==========================
router.post("/login", async (req, res) => {
  console.log("🔑 Rota /auth/login chamada");
  await loginPassenger(req, res);
});

// ==========================
// PERFIL (token obrigatório)
router.get("/profile", verifyToken, async (req, res) => {
  console.log("👤 Rota /auth/profile chamada por:", req.user);
  await getProfile(req, res);
});

// ==========================
// LOGOUT
router.post("/logout", verifyToken, async (req, res) => {
  console.log("🚪 Rota /auth/logout chamada por:", req.user);
  await logout(req, res);
});

module.exports = router;
