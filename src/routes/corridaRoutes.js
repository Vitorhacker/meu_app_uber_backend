// src/routes/corridasRoutes.js
const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ======================================================
// 🚕 CRIAR CORRIDA
// ======================================================
router.post("/", verifyToken, corridaController.create);

// ======================================================
// 🔍 BUSCAR CORRIDA PELO ID
// ======================================================
router.get("/:id", verifyToken, corridaController.getById);

// ======================================================
// 🚕 BUSCAR MOTORISTA
// ======================================================
router.post("/:id/findDriver", verifyToken, corridaController.findDriver);

// ======================================================
// 🚘 MOTORISTA ACEITA CORRIDA
// ======================================================
router.post("/:id/accept", verifyToken, corridaController.accept);

// ======================================================
// 🚦 MOTORISTA CHEGOU
// ======================================================
router.post("/:id/driverArrived", verifyToken, corridaController.driverArrived);

// ======================================================
// 🚦 INICIAR CORRIDA
// ======================================================
router.post("/:id/start", verifyToken, corridaController.start);

// ======================================================
// 🏁 FINALIZAR CORRIDA
// ======================================================
router.post("/:id/finish", verifyToken, corridaController.finish);

// ======================================================
// ❌ CANCELAR CORRIDA
// ======================================================
router.post("/:id/cancel", verifyToken, corridaController.cancel);

// ======================================================
// 🛑 PARADAS
// ======================================================
router.post("/:id/parada", verifyToken, corridaController.addParada);
router.put("/:id/paradas", verifyToken, corridaController.updateParadas);

// ======================================================
// 🔄 ATUALIZAR CATEGORY
// ======================================================
router.put("/:id/category", verifyToken, corridaController.updateCategory);

module.exports = router;
