// backend/src/routes/tarifasRoutes.js
const express = require('express');
const router = express.Router();
const { tarifas, VALOR_MINIMO, MULTIPLICADOR_PICO, MULTIPLICADOR_NOITE, calcularValor } = require('../utils/tarifas');

/**
 * GET /api/tarifas
 * Retorna tarifas, valor mínimo e multiplicadores
 */
router.get('/', (req, res) => {
  res.json({ tarifas, VALOR_MINIMO, MULTIPLICADOR_PICO, MULTIPLICADOR_NOITE });
});

/**
 * POST /api/tarifas/calcular
 * Body: { categoria, distancia, duracao, stops }
 * Retorna: { valor }
 */
router.post('/calcular', (req, res) => {
  const { categoria, distancia, duracao, stops } = req.body;

  if (!categoria || distancia == null || duracao == null) {
    return res.status(400).json({ error: 'Parâmetros inválidos. Envie categoria, distancia e duracao.' });
  }

  try {
    const valor = calcularValor(categoria, distancia, duracao, stops || 0, new Date());
    return res.json({ valor });
  } catch (err) {
    console.error('Erro ao calcular valor:', err);
    return res.status(500).json({ error: 'Erro ao calcular valor da corrida.' });
  }
});

module.exports = router;
