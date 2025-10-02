// backend/src/routes/tarifasRoutes.js
const express = require('express');
const router = express.Router();
const { tarifas, VALOR_MINIMO, MULTIPLICADOR_PICO, MULTIPLICADOR_NOITE } = require('../utils/tarifas');

router.get('/', (req, res) => {
  res.json({ tarifas, VALOR_MINIMO, MULTIPLICADOR_PICO, MULTIPLICADOR_NOITE });
});

module.exports = router;
