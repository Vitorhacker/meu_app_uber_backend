const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Etapa 1 - Criar corrida
router.post("/", verifyToken, corridaController.create);

// Etapa 2 - Buscar corrida pelo ID
router.get("/:id", verifyToken, corridaController.getById);

// Etapa 3 - Procurar motorista
router.post("/:id/findDriver", verifyToken, corridaController.findDriver);

// Motorista aceita corrida
router.post("/:id/accept", verifyToken, corridaController.accept);

// Motorista chegou
router.post("/:id/arrived", verifyToken, corridaController.driverArrived);

// Iniciar corrida
router.post("/:id/start", verifyToken, corridaController.start);

// Finalizar corrida
router.post("/:id/finish", verifyToken, corridaController.finish);

// Cancelar corrida
router.post("/:id/cancel", verifyToken, corridaController.cancel);

module.exports = router;
