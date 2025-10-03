const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// Pegar saldo do usuário
router.get("/:userId", walletController.getSaldo);

// Adicionar saldo à wallet
router.post("/add", walletController.addSaldo);

// Histórico de wallet (opcional)
router.get("/history/:userId", walletController.getHistory);

module.exports = router;
