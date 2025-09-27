// src/routes/avaliacaoRoutes.js
const express = require("express");
const router = express.Router();
const avaliacaoController = require("../controllers/avaliacaoController");
const { checkAuth, checkRole } = require("../middlewares/authMiddleware");

// Passageiro ou motorista pode criar avaliação
router.post("/", checkAuth, checkRole("passageiro", "motorista"), avaliacaoController.create);

// Todos autenticados podem ver avaliações de uma corrida
router.get("/corrida/:corrida_id", checkAuth, avaliacaoController.getByCorrida);

module.exports = router;
