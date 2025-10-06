const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ======================
// PASSAGEIRO
// ======================
router.post("/register", authController.registerPassenger);
router.post("/login", authController.loginPassenger);

// ======================
// PERFIL e LOGOUT
// ======================
router.get("/me", verifyToken, authController.getProfile);
router.post("/logout", verifyToken, authController.logout);

module.exports = router;
