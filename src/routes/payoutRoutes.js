// src/routes/payoutRoutes.js
const express = require("express");
const router = express.Router();
const payoutController = require("../controllers/payoutController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// =========================
// ROTAS DE PAYOUTS
// =========================

// Criar payout (somente admin pode agendar)
router.post("/", verifyToken, requireRole("admin"), payoutController.create);

// Listar todos os payouts (somente admin)
router.get("/", verifyToken, requireRole("admin"), payoutController.list);

// Processar payout (somente admin)
router.put("/:id/process", verifyToken, requireRole("admin"), payoutController.process);

module.exports = router;
