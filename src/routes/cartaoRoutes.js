const express = require("express");
const router = express.Router();
const cartaoController = require("../controllers/cartaoController");

// Registrar cartão + cobrança automática
router.post("/registrar", cartaoController.registrarCartao);

// Verificar se existe cartão (não retorna dados sensíveis)
router.get("/:passageiroId", cartaoController.verificarCartao);

// Remover cartão
router.delete("/remover", cartaoController.removerCartao);

module.exports = router;
