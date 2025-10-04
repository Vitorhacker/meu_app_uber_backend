const express = require("express");
const router = express.Router();

const cartaoController = require("../controllers/cartaoController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Registrar cartão
router.post("/register", verifyToken, cartaoController.registrarCartao);

// Remover cartão
router.post("/remove", verifyToken, cartaoController.removerCartao);

// Consultar cartão salvo
router.get("/:passageiroId", verifyToken, cartaoController.consultarCartao);

module.exports = router;
