const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Criar corrida
router.post("/", verifyToken, corridaController.create);

// Aceitar corrida
router.post("/:id/accept", verifyToken, corridaController.accept);

// Motorista chegou
router.post("/:id/arrived", verifyToken, corridaController.driverArrived);

// Iniciar corrida
router.post("/:id/start", verifyToken, corridaController.start);

// Atualizar localização
router.post("/location", verifyToken, corridaController.updateLocation);

// Finalizar corrida
router.post("/:id/finish", verifyToken, corridaController.finish);

// Cancelar corrida
router.post("/:id/cancel", verifyToken, corridaController.cancel);

// Buscar corrida atual do passageiro
router.get("/passageiro/:passageiro_id/atual", verifyToken, corridaController.getCurrentRideByPassenger);

// Buscar corrida atual do motorista
router.get("/motorista/:motorista_id/atual", verifyToken, corridaController.getCurrentRideByDriver);

// Motoristas online próximos
router.get("/motoristas/online", verifyToken, corridaController.getOnlineDriversNearby);

module.exports = router;
