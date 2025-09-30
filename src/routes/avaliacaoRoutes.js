// src/routes/avaliacaoRoutes.js
const express = require("express");
const router = express.Router();
const avaliacaoController = require("../controllers/avaliacaoController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Criar avaliação (motorista ou passageiro)
router.post("/", verifyToken, avaliacaoController.createAvaliacao);

// Listar avaliações recebidas por um usuário
router.get("/user/:userId", verifyToken, avaliacaoController.getAvaliacoesByUser);

// Média de avaliações de um usuário
router.get("/user/:userId/media", verifyToken, avaliacaoController.getMediaAvaliacoes);

module.exports = router;
