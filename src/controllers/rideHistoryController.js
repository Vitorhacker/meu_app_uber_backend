const pool = require("../db");

// ======================
// LISTAR RIDE HISTORY DE UM PASSAGEIRO
// ======================
exports.getByPassenger = async (req, res) => {
  try {
    const passageiro_id = req.params.passageiro_id;

    const result = await pool.query(
      `SELECT 
         id,
         corrida_id,
         origem,
         destino,
         origem_lat,
         origem_lng,
         destino_lat,
         destino_lng,
         distancia,
         duracao,
         valor_pago,
         forma_pagamento,
         motorista_nome,
         motorista_placa,
         category,
         paradas,
         criado_em
       FROM ride_history
       WHERE passageiro_id = $1
       ORDER BY criado_em DESC`,
      [passageiro_id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar ride history:", err);
    return res.status(500).json({ error: "Erro ao buscar ride history" });
  }
};
