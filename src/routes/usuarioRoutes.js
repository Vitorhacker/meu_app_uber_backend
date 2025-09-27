// src/routes/usuarioRoutes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { checkAuth, checkRole } = require("../middlewares/authMiddleware");

// Apenas admins podem listar todos os usuários
router.get("/", checkAuth, checkRole("admin"), usuarioController.getAll);

// Usuário autenticado pode ver e atualizar seu próprio perfil
router.get("/:id", checkAuth, usuarioController.getById);
router.put("/:id", checkAuth, usuarioController.update);

// Apenas admin pode deletar usuário
router.delete("/:id", checkAuth, checkRole("admin"), usuarioController.remove);

module.exports = router;
