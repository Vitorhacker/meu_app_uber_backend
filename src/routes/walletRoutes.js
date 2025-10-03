// src/routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

router.get("/:userId", walletController.getBalance);
router.post("/add", walletController.addBalance);
router.post("/confirm-pix", walletController.confirmPix);
router.get("/transactions/:userId", walletController.listTransactions);

module.exports = router;
