const express = require("express");
const corridaController = require("../controllers/corridaController");
const { verifyToken } = require("../middlewares/authMiddleware"); // Middleware de autenticação JWT

const router = express.Router();

// 🔹 Todas as rotas abaixo exigem usuário autenticado
router.use(verifyToken);

// 🟢 Criar corrida
router.post("/", corridaController.create);

// 🧭 Buscar corrida pelo ID
router.get("/:id", corridaController.getById);

// 🚕 Iniciar busca de motorista
router.post("/:id/findDriver", corridaController.findDriver);

// 🚗 Motorista aceita corrida
router.post("/:id/accept", corridaController.accept);

// 🚦 Motorista chegou
router.post("/:id/driverArrived", corridaController.driverArrived);

// 🚦 Iniciar corrida
router.post("/:id/start", corridaController.start);

// 🏁 Finalizar corrida
router.post("/:id/finish", corridaController.finish);

// ❌ Cancelar corrida
router.post("/:id/cancel", corridaController.cancel);

module.exports = router;
