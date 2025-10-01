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

// Iniciar corrida
router.put("/:id/start", ctrl.start);

// Finalizar corrida
router.put("/:id/finish", ctrl.finish);

// Cancelar corrida
router.put("/:id/cancel", ctrl.cancel);

// Atualizar localização do motorista (via REST)
router.put("/:id/location", ctrl.updateLocation);

// ======================
// FILTROS E HISTÓRICO
// ======================
router.get("/passageiro/:id", ctrl.listByPassenger);
router.get("/motorista/:id", ctrl.listByDriver);
router.get("/historico/passageiro/:id", ctrl.historyPassenger);
router.get("/historico/motorista/:id", ctrl.historyDriver);

// ======================
// PAGAMENTOS
// ======================
router.post("/webhook/pagamento", ctrl.paymentWebhook);

// ======================
// PUSH TOKEN / NOTIFICAÇÃO
// ======================
router.put("/motorista/:id/token", ctrl.savePushToken);
router.post("/motorista/notify", ctrl.notifyMotorista);

module.exports = router;
