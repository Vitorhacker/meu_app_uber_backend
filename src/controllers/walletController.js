const pool = require("../db");

// ======================
// PEGAR SALDO DO USUÁRIO
// ======================
exports.getSaldo = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      "SELECT balance, currency, reserved, updated_at FROM wallets WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Wallet não encontrada" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar saldo:", err);
    return res.status(500).json({ error: "Erro interno ao buscar saldo" });
  }
};

// ======================
// ADICIONAR SALDO
// ======================
exports.addSaldo = async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, valor, metodo } = req.body;

    if (!userId || !valor || !metodo) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    if (valor < 20 || valor > 300) {
      return res.status(400).json({ error: "Valor deve ser entre R$ 20 e R$ 300" });
    }

    await client.query("BEGIN");

    // Verificar wallet
    const walletRes = await client.query("SELECT * FROM wallets WHERE user_id = $1", [userId]);
    if (walletRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Wallet não encontrada" });
    }

    // TODO: Aqui você chamaria a integração real com Cartão ou PIX via backend
    // Por enquanto vamos simular sucesso do pagamento
    // Se quiser, depois podemos integrar PicPay ou outro gateway
    console.log(`Simulando pagamento ${metodo} de R$ ${valor}`);

    // Atualiza wallet
    await client.query(
      "UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2",
      [valor, userId]
    );

    // Registrar histórico (opcional)
    await client.query(
      `INSERT INTO wallet_history (user_id, amount, metodo, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, valor, metodo]
    );

    await client.query("COMMIT");

    return res.json({ success: true, message: "Saldo adicionado com sucesso", valor });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao adicionar saldo:", err);
    return res.status(500).json({ error: "Erro interno ao adicionar saldo" });
  } finally {
    client.release();
  }
};

// ======================
// LISTAR HISTÓRICO DA WALLET
// ======================
exports.getHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      "SELECT * FROM wallet_history WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar histórico da wallet:", err);
    return res.status(500).json({ error: "Erro interno ao buscar histórico" });
  }
};
