// src/routes/agendarTarifasRoutes.js
const express = require("express");
const router = express.Router();
const { listarTarifas, calcularTarifa } = require("../utils/agendartarifas");
const agendarController = require("../controllers/agendarController");

// ==========================
// 🔹 Tarifas
// ==========================

// GET /api/agendartarifas
router.get("/", (req, res) => {
  try {
    const tarifas = listarTarifas();
    res.json({ success: true, tarifas });
  } catch (err) {
    console.error("❌ Erro ao listar tarifas:", err);
    res.status(500).json({ success: false, message: "Erro ao listar tarifas." });
  }
});

// POST /api/agendartarifas/calcular
router.post("/calcular", (req, res) => {
  try {
    const { origem, destino, distanciaKm } = req.body;
    if (!origem || !destino || !distanciaKm) {
      return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
    }

    const tarifaCalculada = calcularTarifa({ origem, destino, distanciaKm });
    res.json({ success: true, tarifa: tarifaCalculada });
  } catch (err) {
    console.error("❌ Erro ao calcular tarifa:", err);
    res.status(500).json({ success: false, message: "Erro ao calcular tarifa." });
  }
});

// ==========================
// 🔹 Agendamentos
// ==========================

// POST /api/agendartarifas/agendar → cria agendamento
router.post("/agendar", agendarController.criarAgendamento);

// GET /api/agendartarifas/agendar → lista agendamentos pendentes
router.get("/agendar/listar", agendarController.listarAgendamentos);

// POST /api/agendartarifas/agendar/aceitar → motorista aceita viagem
router.post("/agendar/aceitar", agendarController.aceitarAgendamento);

// POST /api/agendartarifas/agendar/cancelar → passageiro cancela viagem
router.post("/agendar/cancelar", agendarController.cancelarAgendamento);

module.exports = router;
