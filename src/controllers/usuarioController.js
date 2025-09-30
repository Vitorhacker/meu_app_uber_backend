// src/controllers/usuarioController.js
const pool = require("../db");
const bcrypt = require("bcryptjs");

// ==============================
// LISTAR USUÁRIOS (com paginação e filtro por role)
// ==============================
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = "SELECT id, nome, email, role, created_at FROM usuarios WHERE deleted_at IS NULL";
    let params = [];
    if (role) {
      params.push(role);
      baseQuery += ` AND role = $${params.length}`;
    }

    baseQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro no list:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// OBTER UM USUÁRIO ESPECÍFICO
// ==============================
exports.get = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      "SELECT id, nome, email, role, created_at FROM usuarios WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro no get:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// CRIAR NOVO USUÁRIO
// ==============================
exports.create = async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;

    // valida duplicidade de e-mail
    const check = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(senha, 10);
    const q = `INSERT INTO usuarios (nome, email, senha, role, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               RETURNING id, nome, email, role`;
    const r = await pool.query(q, [nome, email, hashed, role]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("Erro no create:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// ATUALIZAR USUÁRIO (nome, email, senha se enviada)
// ==============================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha } = req.body;

    let updates = [];
    let params = [];
    let idx = 1;

    if (nome) {
      updates.push(`nome = $${idx++}`);
      params.push(nome);
    }
    if (email) {
      updates.push(`email = $${idx++}`);
      params.push(email);
    }
    if (senha) {
      const hashed = await bcrypt.hash(senha, 10);
      updates.push(`senha = $${idx++}`);
      params.push(hashed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nenhum dado para atualizar" });
    }

    params.push(id);
    const q = `UPDATE usuarios SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx} AND deleted_at IS NULL RETURNING id, nome, email, role`;
    const r = await pool.query(q, params);

    if (r.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro no update:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// SOFT DELETE (marca como deletado)
// ==============================
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const q = "UPDATE usuarios SET deleted_at = NOW() WHERE id = $1 RETURNING id";
    const r = await pool.query(q, [id]);

    if (r.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ ok: true, message: "Usuário marcado como deletado" });
  } catch (err) {
    console.error("Erro no remove:", err);
    res.status(500).json({ error: err.message });
  }
};
