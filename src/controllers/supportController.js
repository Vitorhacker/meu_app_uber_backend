// src/controllers/supportController.js
const pool = require("../db");

// Criar um novo chamado de suporte
exports.createTicket = async (req, res) => {
  const { assunto, descricao } = req.body;
  const usuario_id = req.user.id; // vem do verifyToken

  try {
    const result = await pool.query(
      `INSERT INTO support_tickets (usuario_id, assunto, descricao, status, created_at) 
       VALUES ($1, $2, $3, 'aberto', NOW()) RETURNING *`,
      [usuario_id, assunto, descricao]
    );

    res.status(201).json({
      message: "Chamado de suporte criado com sucesso.",
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao criar ticket:", error);
    res.status(500).json({ error: "Erro ao criar ticket de suporte." });
  }
};

// Listar tickets do usuário
exports.getMyTickets = async (req, res) => {
  const usuario_id = req.user.id;

  try {
    const result = await pool.query(
      "SELECT * FROM support_tickets WHERE usuario_id = $1 ORDER BY created_at DESC",
      [usuario_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar tickets do usuário:", error);
    res.status(500).json({ error: "Erro ao buscar tickets." });
  }
};

// Listar todos os tickets (admin)
exports.getAllTickets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT st.*, u.nome, u.email 
       FROM support_tickets st
       JOIN usuarios u ON u.id = st.usuario_id
       ORDER BY st.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar todos tickets:", error);
    res.status(500).json({ error: "Erro ao buscar tickets." });
  }
};

// Atualizar status do ticket
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // aberto | em_andamento | resolvido

  try {
    const result = await pool.query(
      "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ticket não encontrado." });
    }

    res.json({
      message: "Status do ticket atualizado com sucesso.",
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({ error: "Erro ao atualizar status do ticket." });
  }
};

// Adicionar resposta ao ticket
exports.addResponse = async (req, res) => {
  const { id } = req.params;
  const { resposta } = req.body;
  const usuario_id = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE support_tickets 
       SET respostas = COALESCE(respostas, '[]'::jsonb) || jsonb_build_object(
         'usuario_id', $1,
         'resposta', $2,
         'data', NOW()
       ),
       updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [usuario_id, resposta, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ticket não encontrado." });
    }

    res.json({
      message: "Resposta adicionada com sucesso.",
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao adicionar resposta:", error);
    res.status(500).json({ error: "Erro ao adicionar resposta ao ticket." });
  }
};
