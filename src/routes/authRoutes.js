const express = require("express");
const router = express.Router();
const { registerPassenger, loginPassenger, getProfile, logout } = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Registro passageiro
router.post("/register", registerPassenger);

// Login passageiro
router.post("/login", loginPassenger);

// Perfil
router.get("/profile", verifyToken, getProfile);

// Logout
router.post("/logout", verifyToken, logout);

module.exports = router;
