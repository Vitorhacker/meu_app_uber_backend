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
// MOTORISTA
// ======================
router.post("/registerdriver", authController.registerDriver);
router.post("/logindriver", authController.loginDriver);

// ======================
// PERFIL, REFRESH e LOGOUT
// ======================
router.get("/me", verifyToken, authController.getProfile);
router.post("/refresh", verifyToken, authController.refreshToken);
router.post("/logout", verifyToken, authController.logout);

module.exports = router;
