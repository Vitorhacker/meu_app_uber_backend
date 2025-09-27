// src/routes/corridaRoutes.js
const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { checkAuth, checkRole } = require("../middlewares/authMiddleware");

// Passageiro pode criar corrida
router.post("/", checkAuth, checkRole("passageiro"), corridaController.create);

// Motorista pode atualizar status (aceitar, concluir, etc)
router.put("/:id/status", checkAuth, checkRole("motorista", "admin"), corridaController.updateStatus);

// Passageiro pode listar suas próprias corridas
router.get("/passageiro/:passageiro_id", checkAuth, checkRole("passageiro", "admin"), corridaController.getByPassageiro);

module.exports = router;
