const express = require("express");
const router = express.Router();
const passengerController = require("../controllers/passengerController");

// Logs
router.use((req, res, next) => {
  console.log(`📡 [PASSENGER] ${req.method} ${req.originalUrl}`);
  next();
});

// Criar passageiro vinculado
router.post("/", passengerController.registerPassenger);

module.exports = router;
