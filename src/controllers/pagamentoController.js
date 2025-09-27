// src/controllers/pagamentoController.js
const pool = require("../db");

// Criar pagamento
exports.create = async (req, res) => {
  try {
    const { corrida_id, valor, metodo } = req.body;
    if (!corrida_id || !valor || !metodo) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const q = `
      INSERT INTO pagamentos (corrida_id, valor, metodo, status)
      VALUES ($1, $2, $3, 'pendente')
      RETURNING *
    `;
    const result = await pool.query(q, [corrida_id, valor, metodo]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[pagamentos.create]", err);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
};

// Atualizar status do pagamento
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      "UPDATE pagamentos SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[pagamentos.updateStatus]", err);
    res.status(500).json({ error: "Erro ao atualizar pagamento" });
  }
};
