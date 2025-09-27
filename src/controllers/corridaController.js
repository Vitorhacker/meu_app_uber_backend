// src/controllers/corridaController.js
const pool = require("../db");

// Criar corrida
exports.create = async (req, res) => {
  try {
    const { passageiro_id, origem, destino, preco } = req.body;
    if (!passageiro_id || !origem || !destino) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const q = `
      INSERT INTO corridas (passageiro_id, origem, destino, status, preco)
      VALUES ($1, $2, $3, 'solicitada', $4)
      RETURNING *
    `;
    const result = await pool.query(q, [passageiro_id, origem, destino, preco]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[corridas.create]", err);
    res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// Atualizar status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motorista_id } = req.body;

    const q = `
      UPDATE corridas
      SET status = $1, motorista_id = COALESCE($2, motorista_id)
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(q, [status, motorista_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[corridas.updateStatus]", err);
    res.status(500).json({ error: "Erro ao atualizar corrida" });
  }
};

// Listar corridas por passageiro
exports.getByPassageiro = async (req, res) => {
  try {
    const { passageiro_id } = req.params;
    const result = await pool.query("SELECT * FROM corridas WHERE passageiro_id = $1", [passageiro_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("[corridas.getByPassageiro]", err);
    res.status(500).json({ error: "Erro ao buscar corridas" });
  }
};
