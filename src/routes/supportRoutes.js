// src/routes/supportRoutes.js
const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// Criar ticket de suporte (usuário autenticado)
router.post("/", verifyToken, supportController.createTicket);

// Listar tickets do próprio usuário
router.get("/me", verifyToken, supportController.getMyTickets);

// Listar todos os tickets (somente admin)
router.get("/", verifyToken, requireRole("admin"), supportController.getAllTickets);

// Atualizar status do ticket (admin)
router.put("/:id/status", verifyToken, requireRole("admin"), supportController.updateStatus);

// Adicionar resposta (usuário ou admin)
router.post("/:id/responses", verifyToken, supportController.addResponse);

module.exports = router;
