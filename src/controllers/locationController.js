// src/controllers/locationController.js
const pool = require("../db");

// Salva/atualiza localização e reflete na corrida
exports.update = async (req, res) => {
  const { user_id, latitude, longitude } = req.body;

  // 1. Validar se veio latitude/longitude
  if (
    !user_id ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return res.status(400).json({ error: "Localização inválida ou faltando." });
  }

  try {
    // 2. Atualizar/salvar localização em user_locations
    const q1 = `
      INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET latitude=$2, longitude=$3, updated_at=NOW()
      RETURNING user_id, latitude, longitude, updated_at;
    `;
    const r1 = await pool.query(q1, [user_id, latitude, longitude]);

    // 3. Verificar se usuário é motorista em corrida em andamento
    const q2 = `
      UPDATE corridas
      SET motorista_latitude=$2, motorista_longitude=$3, updated_at=NOW()
      WHERE motorista_id=$1 AND status='em_andamento'
      RETURNING id, status, motorista_id, motorista_latitude, motorista_longitude;
    `;
    const r2 = await pool.query(q2, [user_id, latitude, longitude]);

    res.json({
      location: r1.rows[0],
      corridaAtualizada: r2.rows[0] || null,
    });
  } catch (err) {
    console.error("❌ Erro ao atualizar localização:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Retorna localização atual de 1 usuário
exports.get = async (req, res) => {
  const { user_id } = req.params;
  try {
    const q = "SELECT user_id, latitude, longitude, updated_at FROM user_locations WHERE user_id = $1";
    const r = await pool.query(q, [user_id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "Localização não encontrada" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar localização:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Retorna todas localizações (admin/painel)
exports.list = async (req, res) => {
  try {
    const q = "SELECT user_id, latitude, longitude, updated_at FROM user_locations ORDER BY updated_at DESC";
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error("❌ Erro ao listar localizações:", err.message);
    res.status(500).json({ error: err.message });
  }
};
