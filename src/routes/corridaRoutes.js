const express = require("express");
const router = express.Router();
const corridaController = require("../controllers/corridaController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// Passageiro
router.post("/", verifyToken, requireRole("passageiro"), corridaController.create);
router.get("/:id", verifyToken, requireRole("passageiro"), corridaController.getById);
router.post("/:id/find-driver", verifyToken, requireRole("passageiro"), corridaController.findDriver);
router.post("/:id/finish", verifyToken, requireRole("passageiro"), corridaController.finish);
router.post("/:id/cancel", verifyToken, requireRole("passageiro"), corridaController.cancel);

module.exports = router;
