const express = require("express");
const router = express.Router();
const cartaoController = require("../controllers/cartaoController");

// ======================
// CARTÃO DE PAGAMENTO
// ======================

// Registrar novo cartão
router.post("/registrar", cartaoController.registrarCartao);

// Consultar cartão cadastrado do usuário
router.get("/consultar/:passageiroId", cartaoController.consultarCartao);

// Remover cartão
router.post("/remover", cartaoController.removerCartao);

module.exports = router;
