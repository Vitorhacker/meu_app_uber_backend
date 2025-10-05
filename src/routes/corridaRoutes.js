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
router.get("/passenger/:passageiro_id/current", verifyToken, corridaController.getCurrentRideByPassenger);

// Buscar corrida atual do motorista
router.get("/driver/:motorista_id/current", verifyToken, corridaController.getCurrentRideByDriver);

// Motoristas online próximos
router.get("/drivers/nearby", verifyToken, corridaController.getOnlineDriversNearby);

module.exports = router;
