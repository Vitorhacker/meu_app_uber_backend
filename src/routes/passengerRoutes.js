// routes/passengerRoutes.js
const express = require("express");
const router = express.Router();
const passengerController = require("../controllers/passengerController");

// rota de cadastro de passageiro
router.post("/passenger", passengerController.createPassenger);

module.exports = router;
