// src/controllers/avaliacaoController.js
import pool from "../db.js";

// Criar avaliação
export const create = async (req, res) => {
  try {
    const { corrida_id, avaliador_id, nota, comentario } = req.body;
    if (!corrida_id || !avaliador_id || !nota) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const q = `
      INSERT INTO avaliacoes (corrida_id, avaliador_id, nota, comentario)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(q, [corrida_id, avaliador_id, nota, comentario]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[avaliacoes.create]", err);
    res.status(500).json({ error: "Erro ao criar avaliação" });
  }
};

// Listar avaliações de uma corrida
export const getByCorrida = async (req, res) => {
  try {
    const { corrida_id } = req.params;
    const result = await pool.query("SELECT * FROM avaliacoes WHERE corrida_id = $1", [corrida_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("[avaliacoes.getByCorrida]", err);
    res.status(500).json({ error: "Erro ao buscar avaliações" });
  }
};
