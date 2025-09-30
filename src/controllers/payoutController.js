// src/controllers/payoutController.js
const pool = require('../db');
const crypto = require('crypto');

function newId() {
  return crypto.randomUUID();
}

// Criar payout agendado (gerado pela plataforma)
exports.create = async (req, res) => {
  const { user_id, amount } = req.body;
  try {
    const q = `INSERT INTO payout_requests (id, user_id, amount, status, requested_at)
               VALUES ($1,$2,$3,$4,NOW()) RETURNING *`;
    const r = await pool.query(q, [newId(), user_id, amount, 'pendente']);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Erro ao criar payout:', err);
    res.status(500).json({ error: err.message });
  }
};

// Listar payouts
exports.list = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM payout_requests ORDER BY requested_at DESC');
    res.json(r.rows);
  } catch (err) {
    console.error('Erro ao listar payouts:', err);
    res.status(500).json({ error: err.message });
  }
};

// Processar payout (admin)
exports.process = async (req, res) => {
  const { id } = req.params;
  try {
    const q = `UPDATE payout_requests SET status=$1, processed_at=NOW() WHERE id=$2 RETURNING *`;
    const r = await pool.query(q, ['pago', id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Payout não encontrado' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Erro ao processar payout:', err);
    res.status(500).json({ error: err.message });
  }
};
