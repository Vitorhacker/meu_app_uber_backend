// routes/passengerRoutes.js
const express = require("express");
const router = express.Router();
const passengerController = require("../controllers/passengerController");

// POST /passengers → cria usuário + passageiro
router.post("/", passengerController.createPassenger);

module.exports = router;
