const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// ======================
// WALLET / CARTEIRA
// ======================

// Obter saldo do usuário
router.get("/saldo/:userId", walletController.getBalance);

// Adicionar saldo
router.post("/adicionar", walletController.addBalance);

// Listar transações
router.get("/transacoes/:userId", walletController.listTransactions);

module.exports = router;
