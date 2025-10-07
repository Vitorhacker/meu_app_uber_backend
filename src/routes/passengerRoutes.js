const express = require("express");
const router = express.Router();
const passengerController = require("../controllers/passengerController");

// Registro
router.post("/", passengerController.registerPassenger);

// Login
router.post("/login", passengerController.loginPassenger);

module.exports = router;
