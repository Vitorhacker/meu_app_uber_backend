// src/routes/usuarioRoutes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// ==============================
// ROTAS DE USUÁRIOS (apenas admin pode gerenciar todos os usuários)
// ==============================

// Listar usuários (com paginação e filtro por role)
router.get("/", verifyToken, requireRole("admin"), usuarioController.list);

// Obter usuário por ID
router.get("/:id", verifyToken, requireRole("admin"), usuarioController.get);

// Criar novo usuário
router.post("/", verifyToken, requireRole("admin"), usuarioController.create);

// Atualizar usuário existente
router.put("/:id", verifyToken, requireRole("admin"), usuarioController.update);

// Deletar usuário (soft delete)
router.delete("/:id", verifyToken, requireRole("admin"), usuarioController.remove);

module.exports = router;
