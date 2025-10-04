const express = require("express");
const router = express.Router();
const pagamentoController = require("../controllers/pagamentoController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// Criar pagamento
router.post("/create", verifyToken, pagamentoController.criarPagamento);

// Consultar status do pagamento
router.get("/status/:id", verifyToken, pagamentoController.consultarStatus);

// Confirmar pagamento manual (admin)
router.post("/confirm/:id", verifyToken, requireRole("admin"), pagamentoController.confirmarPagamento);

// Listar pagamentos de um usuário
router.get("/user/:id", verifyToken, pagamentoController.listarPagamentosUsuario);

// Listar todos os pagamentos (admin)
router.get("/all", verifyToken, requireRole("admin"), pagamentoController.listarTodosPagamentos);

module.exports = router;
