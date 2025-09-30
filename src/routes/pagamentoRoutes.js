// src/routes/pagamentoRoutes.js
const express = require('express');
const router = express.Router();

const pagamentoController = require('../controllers/pagamentoController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Criar pagamento (Pix ou cartão)
router.post('/create/:rideId', verifyToken, pagamentoController.criarPagamento);

// Consultar status do pagamento
router.get('/status/:rideId', verifyToken, pagamentoController.consultarStatus);

// Confirmar pagamento manualmente (admin)
router.post('/confirm/:rideId', verifyToken, requireRole('admin'), pagamentoController.confirmarPagamento);

// Listar pagamentos do usuário logado
router.get('/me', verifyToken, pagamentoController.listarPagamentosUsuario);

// Listar todos os pagamentos (admin)
router.get('/all', verifyToken, requireRole('admin'), pagamentoController.listarTodosPagamentos);

module.exports = router;
