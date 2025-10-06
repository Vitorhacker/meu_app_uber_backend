const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// ======================================================
// PASSAGEIRO - Criar corrida
// ======================================================
router.post("/", verifyToken, requireRole("passageiro"), corridaController.create);

// ======================================================
// PASSAGEIRO - Buscar corrida por ID
// ======================================================
router.get("/:id", verifyToken, requireRole("passageiro"), corridaController.getById);

// ======================================================
// PASSAGEIRO - Iniciar busca de motorista
// ======================================================
router.post("/:id/find-driver", verifyToken, requireRole("passageiro"), corridaController.findDriver);

// ======================================================
// PASSAGEIRO - Finalizar corrida
// ======================================================
router.post("/:id/finish", verifyToken, requireRole("passageiro"), corridaController.finish);

// ======================================================
// PASSAGEIRO - Cancelar corrida
// ======================================================
router.post("/:id/cancel", verifyToken, requireRole("passageiro"), corridaController.cancel);

module.exports = router;
