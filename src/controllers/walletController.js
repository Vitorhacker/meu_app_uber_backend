const pool = require("../db");

// ======================
// OBTER SALDO DE UM USUÁRIO
// ======================
exports.getBalance = async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query("SELECT balance, reserved, currency FROM wallets WHERE user_id = $1", [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Wallet não encontrada para este usuário." });
    }

    const wallet = result.rows[0];
    return res.json({
      user_id,
      balance: parseFloat(wallet.balance),
      reserved: parseFloat(wallet.reserved),
      currency: wallet.currency
    });
  } catch (err) {
    console.error("Erro ao obter saldo da wallet:", err);
    return res.status(500).json({ error: "Erro interno ao obter saldo da wallet." });
  }
};

// ======================
// ADICIONAR SALDO
// ======================
exports.addBalance = async (req, res) => {
  try {
    const { user_id, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Valor inválido para adicionar." });

    const result = await pool.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance, reserved, currency`,
      [amount, user_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Wallet não encontrada para este usuário." });

    const wallet = result.rows[0];
    return res.json({
      user_id,
      balance: parseFloat(wallet.balance),
      reserved: parseFloat(wallet.reserved),
      currency: wallet.currency
    });
  } catch (err) {
    console.error("Erro ao adicionar saldo na wallet:", err);
    return res.status(500).json({ error: "Erro interno ao adicionar saldo." });
  }
};

// ======================
// DEDUZIR SALDO
// ======================
exports.deductBalance = async (req, res) => {
  try {
    const { user_id, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Valor inválido para deduzir." });

    const walletRes = await pool.query("SELECT balance, reserved FROM wallets WHERE user_id = $1", [user_id]);
    if (walletRes.rows.length === 0) return res.status(404).json({ error: "Wallet não encontrada." });

    const { balance } = walletRes.rows[0];
    if (parseFloat(balance) < amount) return res.status(400).json({ error: "Saldo insuficiente." });

    const result = await pool.query(
      `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance, reserved, currency`,
      [amount, user_id]
    );

    const wallet = result.rows[0];
    return res.json({
      user_id,
      balance: parseFloat(wallet.balance),
      reserved: parseFloat(wallet.reserved),
      currency: wallet.currency
    });
  } catch (err) {
    console.error("Erro ao deduzir saldo na wallet:", err);
    return res.status(500).json({ error: "Erro interno ao deduzir saldo." });
  }
};
