const express = require("express");
const router = express.Router();
const rideHistoryController = require("../controllers/rideHistoryController");

// Listar histórico de corridas de um passageiro
router.get("/:passageiro_id", rideHistoryController.getByPassenger);

module.exports = router;
