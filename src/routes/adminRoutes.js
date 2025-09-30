// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// Apenas admin acessa
router.use(verifyToken, requireRole("admin"));

// Usuários
router.get("/users", adminController.listUsers);
router.post("/users/block", adminController.toggleBlockUser);
router.delete("/users/:userId", adminController.deleteUser);

// Corridas
router.get("/rides", adminController.listRides);

// Saques
router.get("/withdraws", adminController.listWithdrawRequests);
router.post("/withdraws/update", adminController.updateWithdrawRequest);

module.exports = router;
