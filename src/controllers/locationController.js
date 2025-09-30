// src/controllers/locationController.js
const pool = require("../db");

// Salva/atualiza localização (usado no REST ou fallback)
exports.update = async (req, res) => {
  const { user_id, latitude, longitude } = req.body;
  try {
    const q = `
      INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET latitude=$2, longitude=$3, updated_at=NOW()
      RETURNING *;
    `;
    const r = await pool.query(q, [user_id, latitude, longitude]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar localização:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Retorna localização atual de 1 usuário
exports.get = async (req, res) => {
  const { user_id } = req.params;
  try {
    const q = "SELECT * FROM user_locations WHERE user_id = $1";
    const r = await pool.query(q, [user_id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "Localização não encontrada" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar localização:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Retorna todas localizações (admin/painel)
exports.list = async (req, res) => {
  try {
    const q = "SELECT * FROM user_locations ORDER BY updated_at DESC";
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error("Erro ao listar localizações:", err.message);
    res.status(500).json({ error: err.message });
  }
};
