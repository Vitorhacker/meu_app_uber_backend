// src/controllers/usuarioController.js
const pool = require("../db");

// Lista todos os usuários
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, email, role, created_at FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[usuarios.getAll]", err);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};

// Busca usuário por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, nome, email, role, created_at FROM usuarios WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[usuarios.getById]", err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
};

// Atualiza dados do usuário
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, role } = req.body;

    const result = await pool.query(
      "UPDATE usuarios SET nome = $1, role = $2 WHERE id = $3 RETURNING id, nome, email, role, created_at",
      [nome, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[usuarios.update]", err);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
};

// Deleta usuário
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário deletado com sucesso" });
  } catch (err) {
    console.error("[usuarios.remove]", err);
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
};
