// src/controllers/adminController.js
const pool = require("../db");

// =============================
// LISTAR TODOS OS USUÁRIOS
// =============================
exports.listUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, email, role, created_at FROM usuarios ORDER BY created_at DESC"
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

// =============================
// BLOQUEAR / DESBLOQUEAR USUÁRIO
// =============================
exports.toggleBlockUser = async (req, res) => {
  const { userId, ativo } = req.body; // ativo = true/false
  try {
    await pool.query("UPDATE usuarios SET ativo = $1 WHERE id = $2", [
      ativo,
      userId,
    ]);
    return res.json({ message: "Usuário atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    return res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
};

// =============================
// DELETAR USUÁRIO
// =============================
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [userId]);
    return res.json({ message: "Usuário deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    return res.status(500).json({ error: "Erro ao deletar usuário" });
  }
};

// =============================
// LISTAR CORRIDAS
// =============================
exports.listRides = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.status, r.preco, r.created_at,
             p.nome AS passageiro, m.nome AS motorista
      FROM corridas r
      LEFT JOIN usuarios p ON r.passageiro_id = p.id
      LEFT JOIN usuarios m ON r.motorista_id = m.id
      ORDER BY r.created_at DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar corridas:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

// =============================
// LISTAR PEDIDOS DE SAQUE
// =============================
exports.listWithdrawRequests = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.id, w.valor, w.status, w.created_at, u.nome AS motorista
      FROM withdraw_requests w
      JOIN usuarios u ON w.motorista_id = u.id
      ORDER BY w.created_at DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar saques:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

// =============================
// APROVAR / REJEITAR SAQUE
// =============================
exports.updateWithdrawRequest = async (req, res) => {
  const { requestId, status } = req.body; // "aprovado" | "rejeitado"
  try {
    await pool.query("UPDATE withdraw_requests SET status = $1 WHERE id = $2", [
      status,
      requestId,
    ]);
    return res.json({ message: "Solicitação de saque atualizada" });
  } catch (err) {
    console.error("Erro ao atualizar saque:", err);
    return res.status(500).json({ error: "Erro ao atualizar saque" });
  }
};
