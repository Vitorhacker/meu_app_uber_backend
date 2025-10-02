const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// CRIAR CORRIDA
router.post("/", verifyToken, corridaController.create);

// MOTORISTA ACEITA CORRIDA
router.put("/:id/accept", verifyToken, corridaController.accept);

// INICIAR CORRIDA
router.put("/:id/start", verifyToken, corridaController.start);

// FINALIZAR CORRIDA
router.put("/:id/finish", verifyToken, corridaController.finish);

// CANCELAR CORRIDA
router.put("/:id/cancel", verifyToken, corridaController.cancel);

// ATUALIZAR FORMA DE PAGAMENTO (passageiro pode mudar antes da corrida iniciar)
router.put("/:id/payment", verifyToken, corridaController.updatePayment);

// LISTAR CORRIDAS DE UM PASSAGEIRO
router.get("/passenger/:passageiro_id", verifyToken, corridaController.getByPassenger);

// LISTAR CORRIDAS DE UM MOTORISTA
router.get("/driver/:motorista_id", verifyToken, corridaController.getByDriver);

// ATUALIZAR LOCALIZAÇÃO EM TEMPO REAL
router.put("/location/update", verifyToken, corridaController.updateLocation);

module.exports = router;
