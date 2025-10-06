const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// ======================================================
// PASSAGEIRO - Criar corrida
// ======================================================
router.post(
  "/",
  verifyToken,
  requireRole("passageiro"),
  corridaController.create
);

// ======================================================
// PASSAGEIRO / MOTORISTA - Buscar corrida por ID
// ======================================================
router.get(
  "/:id",
  verifyToken,
  corridaController.getById
);

// ======================================================
// PASSAGEIRO - Iniciar busca de motorista
// ======================================================
router.post(
  "/:id/find-driver",
  verifyToken,
  requireRole("passageiro"),
  corridaController.findDriver
);

// ======================================================
// MOTORISTA - Aceitar corrida
// ======================================================
router.post(
  "/:id/accept",
  verifyToken,
  requireRole("motorista"),
  corridaController.accept
);

// ======================================================
// MOTORISTA - Chegou no local
// ======================================================
router.post(
  "/:id/arrived",
  verifyToken,
  requireRole("motorista"),
  corridaController.driverArrived
);

// ======================================================
// MOTORISTA - Iniciar corrida
// ======================================================
router.post(
  "/:id/start",
  verifyToken,
  requireRole("motorista"),
  corridaController.start
);

// ======================================================
// PASSAGEIRO / MOTORISTA - Finalizar corrida
// ======================================================
router.post(
  "/:id/finish",
  verifyToken,
  corridaController.finish
);

// ======================================================
// PASSAGEIRO / MOTORISTA - Cancelar corrida
// ======================================================
router.post(
  "/:id/cancel",
  verifyToken,
  corridaController.cancel
);

module.exports = router;
