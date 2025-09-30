// src/controllers/withdrawController.js
const pool = require('../db');
const crypto = require('crypto');

function newId() {
  return crypto.randomUUID();
}

// Criar solicitação de saque (motorista)
exports.create = async (req, res) => {
  const { user_id, valor } = req.body;
  try {
    const q = `INSERT INTO withdraw_requests (id, user_id, valor, status, created_at)
               VALUES ($1,$2,$3,$4,NOW()) RETURNING *`;
    const r = await pool.query(q, [newId(), user_id, valor, 'pendente']);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Erro ao criar withdraw:', err);
    res.status(500).json({ error: err.message });
  }
};

// Listar todas solicitações de saque
exports.list = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM withdraw_requests ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) {
    console.error('Erro ao listar withdraws:', err);
    res.status(500).json({ error: err.message });
  }
};

// Aprovar/Marcar como pago
exports.approve = async (req, res) => {
  const { id } = req.params;
  try {
    const q = `UPDATE withdraw_requests SET status=$1, paid_at=NOW() WHERE id=$2 RETURNING *`;
    const r = await pool.query(q, ['pago', id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Solicitação não encontrada' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Erro ao aprovar withdraw:', err);
    res.status(500).json({ error: err.message });
  }
};
