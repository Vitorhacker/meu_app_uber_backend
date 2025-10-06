// routes/corridaRoutes.js
const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// ======================================================
// Rotas de Corrida - Passageiro & Motorista
// ======================================================

// 🔹 Etapa 1 - Criar corrida (passageiro) sem exigir login
router.post("/", corridaController.create);

// 🔹 Etapa 2 - Buscar corrida pelo ID (passageiro/motorista)
router.get("/:id", verifyToken, corridaController.getById);

// 🔹 Etapa 3 - Procurar motorista (passageiro)
router.post("/:id/findDriver", verifyToken, requireRole("passageiro"), corridaController.findDriver);

// 🔹 Motorista aceita corrida
router.post("/:id/accept", verifyToken, requireRole("motorista"), corridaController.accept);

// 🔹 Motorista chegou ao local de partida
router.post("/:id/driverArrived", verifyToken, requireRole("motorista"), corridaController.driverArrived);

// 🔹 Iniciar corrida (motorista)
router.post("/:id/start", verifyToken, requireRole("motorista"), corridaController.start);

// 🔹 Finalizar corrida (passageiro ou motorista)
router.post("/:id/finish", verifyToken, corridaController.finish);

// 🔹 Cancelar corrida (passageiro ou motorista)
router.post("/:id/cancel", verifyToken, corridaController.cancel);

module.exports = router;
