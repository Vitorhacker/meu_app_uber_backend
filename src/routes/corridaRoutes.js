// src/routes/corridaRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/corridaController");

// ======================
// ROTAS DE CORRIDAS
// ======================

// Criar corrida (passageiro solicita)
router.post("/", ctrl.create);

// Listar todas corridas
router.get("/", ctrl.list);

// Buscar corrida por ID
router.get("/:id", ctrl.get);

// Atribuir motorista à corrida
router.put("/:id/assign", ctrl.assignDriver);

// Iniciar corrida (motorista iniciou)
router.put("/:id/start", ctrl.start);

// Finalizar corrida
router.put("/:id/finish", ctrl.finish);

module.exports = router;
