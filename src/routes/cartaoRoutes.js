const express = require("express");
const router = express.Router();
const cartaoController = require("../controllers/cartaoController");

// Registrar cartão
router.post("/registrar", cartaoController.registrarCartao);

// Verificar cartão
router.get("/verify/:passageiroId", cartaoController.verificarCartao);

// Remover cartão
router.delete("/remover", cartaoController.removerCartao);

module.exports = router;
