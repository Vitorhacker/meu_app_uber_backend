// src/routes/locationRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/locationController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Atualizar localização via REST (pode ser fallback)
router.post("/", verifyToken, ctrl.update);

// Buscar localização atual de 1 usuário
router.get("/:user_id", verifyToken, ctrl.get);

// Listar todos (admin)
router.get("/", verifyToken, ctrl.list);

module.exports = router;
