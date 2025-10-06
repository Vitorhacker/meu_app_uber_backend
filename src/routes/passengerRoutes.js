const express = require("express");
const router = express.Router();
const { createPassenger } = require("../controllers/passengerController");

// Rota de cadastro de passageiro (com token permanente)
router.post("/", createPassenger);

module.exports = router;
