// src/controllers/avaliacaoController.js
const pool = require("../db");

// =============================
// CRIAR AVALIAÇÃO
// =============================
exports.createAvaliacao = async (req, res) => {
  const { corrida_id, avaliado_id, nota, comentario } = req.body;
  const avaliador_id = req.user.id; // vem do token

  try {
    // valida corrida
    const corrida = await pool.query("SELECT * FROM corridas WHERE id = $1", [corrida_id]);
    if (corrida.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    // salva avaliação
    const result = await pool.query(
      `INSERT INTO avaliacoes (corrida_id, avaliador_id, avaliado_id, nota, comentario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [corrida_id, avaliador_id, avaliado_id, nota, comentario]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar avaliação:", err);
    return res.status(500).json({ error: "Erro ao criar avaliação" });
  }
};

// =============================
// LISTAR AVALIAÇÕES DE UM USUÁRIO
// =============================
exports.getAvaliacoesByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.id, a.nota, a.comentario, a.created_at,
              u.nome AS avaliador_nome, u.role AS avaliador_role
       FROM avaliacoes a
       JOIN usuarios u ON a.avaliador_id = u.id
       WHERE a.avaliado_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar avaliações:", err);
    return res.status(500).json({ error: "Erro ao buscar avaliações" });
  }
};

// =============================
// MÉDIA DE AVALIAÇÕES DO USUÁRIO
// =============================
exports.getMediaAvaliacoes = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT AVG(nota)::numeric(10,2) AS media, COUNT(*) AS total
       FROM avaliacoes
       WHERE avaliado_id = $1`,
      [userId]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao calcular média:", err);
    return res.status(500).json({ error: "Erro ao calcular média" });
  }
};
