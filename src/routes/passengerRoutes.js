const express = require("express");
const router = express.Router();
const { createPassenger, loginPassenger } = require("../controllers/passengerController");

// Cria passageiro com token permanente
router.post("/", createPassenger);

// Login (opcional, se quiser manter separado)
router.post("/login", loginPassenger);

module.exports = router;
