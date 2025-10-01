// src/routes/corridaRoutes.js
const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Criar corrida
router.post("/", verifyToken, corridaController.create);

// Motorista aceita corrida
router.put("/:id/accept", verifyToken, corridaController.accept);

// Iniciar corrida
router.put("/:id/start", verifyToken, corridaController.start);

// Finalizar corrida
router.put("/:id/finish", verifyToken, corridaController.finish);

// Cancelar corrida
router.put("/:id/cancel", verifyToken, corridaController.cancel);

// Listar corridas de um passageiro
router.get("/passageiro/:passageiro_id", verifyToken, corridaController.getByPassenger);

// Listar corridas de um motorista
router.get("/motorista/:motorista_id", verifyToken, corridaController.getByDriver);

module.exports = router;
