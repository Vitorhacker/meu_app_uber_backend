const express = require("express");
const router = express.Router();
const cartaoController = require("../controllers/cartaoController");

// Middleware para validar body JSON
router.use(express.json());

// ======================================================
// Registrar cartão + cobrança automática via PicPay
// ======================================================
router.post("/registrar", cartaoController.registrarCartao);

// ======================================================
// Verificar se o usuário possui cartão cadastrado
// Não retorna dados sensíveis do cartão
// ======================================================
router.get("/:passageiroId", cartaoController.verificarCartao);

// ======================================================
// Remover cartão do usuário (apaga dados criptografados)
// ======================================================
router.delete("/remover", cartaoController.removerCartao);

module.exports = router;
