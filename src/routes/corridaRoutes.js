const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ======================
// CRUD CORRIDA
// ======================
router.post("/", verifyToken, corridaController.create);
router.put("/:id/accept", verifyToken, corridaController.accept);
router.put("/:id/start", verifyToken, corridaController.start);
router.put("/:id/finish", verifyToken, corridaController.finish);
router.put("/:id/cancel", verifyToken, corridaController.cancel);

// ======================
// Buscar corrida atual do passageiro
// ======================
router.get("/passageiro/:passageiro_id/atual", verifyToken, corridaController.getCurrentRideByPassenger);

// ======================
// Buscar corrida atual do motorista
// ======================
router.get("/motorista/:motorista_id/atual", verifyToken, corridaController.getCurrentRideByDriver);

// ======================
// Buscar motoristas online próximos
// ======================
router.get("/motoristas/online", verifyToken, corridaController.getOnlineDriversNearby);

// ======================
// Atualizar localização em tempo real
// ======================
router.put("/location/update", verifyToken, corridaController.updateLocation);

module.exports = router;
