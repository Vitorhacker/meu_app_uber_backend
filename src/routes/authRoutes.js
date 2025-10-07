const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile
} = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Logs para depuração
router.use((req, res, next) => {
  console.log(`📡 [AUTH] ${req.method} ${req.originalUrl}`);
  next();
});

// Registro usuário + passageiro
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Perfil
router.get("/profile", verifyToken, getProfile);

module.exports = router;
