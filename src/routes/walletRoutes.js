const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// Obter saldo de um usuário
router.get("/:user_id", walletController.getBalance);

// Adicionar saldo
router.post("/add", walletController.addBalance);

// Deduzir saldo
router.post("/deduct", walletController.deductBalance);

module.exports = router;
