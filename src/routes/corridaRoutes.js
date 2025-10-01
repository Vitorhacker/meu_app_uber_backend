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

// Finalizar corrida (motorista recebe líquido + notificação + cria registro em pagamentos)
router.put("/:id/finish", ctrl.finish);

// ======================
// ROTAS PUSH TOKEN / NOTIFICAÇÃO
// ======================

// Salvar push token do motorista
router.put("/motorista/:id/token", ctrl.savePushToken);

// Testar envio de notificação manual
router.post("/motorista/notify", ctrl.notifyMotorista);

module.exports = router;
