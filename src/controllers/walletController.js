const pool = require("../db");
const { v4: uuidv4 } = require("uuid");

// ======================
// Obter saldo do usuário
// ======================
exports.getBalance = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId não informado" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let result = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      await client.query(
        "INSERT INTO wallets (user_id, balance, updated_at) VALUES ($1, 0, NOW())",
        [userId]
      );
      result = await client.query(
        "SELECT balance FROM wallets WHERE user_id = $1",
        [userId]
      );
    }

    await client.query("COMMIT");
    return res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro getBalance:", err.message);
    return res.status(500).json({ error: "Erro interno ao buscar saldo" });
  } finally {
    client.release();
  }
};

// ======================
// Adicionar saldo
// ======================
exports.addBalance = async (req, res) => {
  const { userId, valor, metodo } = req.body;

  if (!userId || !valor || !metodo)
    return res.status(400).json({ error: "Campos obrigatórios faltando" });

  if (valor < 20 || valor > 300)
    return res.status(400).json({ error: "Valor deve estar entre R$ 20 e R$ 300" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const walletCheck = await client.query("SELECT * FROM wallets WHERE user_id = $1", [userId]);
    if (walletCheck.rows.length === 0) {
      await client.query(
        "INSERT INTO wallets (user_id, balance, updated_at) VALUES ($1, 0, NOW())",
        [userId]
      );
    }

    if (metodo === "pix") {
      const qr_code = `PIX-${uuidv4()}`;
      await client.query(
        "INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at, qr_code) VALUES ($1,$2,$3,'pendente',NOW(),$4)",
        [userId, valor, metodo, qr_code]
      );
      await client.query("COMMIT");
      return res.json({ success: true, qr_code });
    }

    if (metodo === "cartao") {
      const userResult = await client.query("SELECT card_token FROM usuarios WHERE id=$1", [userId]);
      if (!userResult.rows[0]?.card_token) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Usuário não possui cartão cadastrado" });
      }

      await client.query(
        "UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2",
        [valor, userId]
      );

      await client.query(
        "INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) VALUES ($1,$2,'cartao','pago',NOW())",
        [userId, valor]
      );

      await client.query("COMMIT");
      return res.json({ success: true });
    }

    await client.query("ROLLBACK");
    return res.status(400).json({ error: "Método de pagamento inválido" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro addBalance:", err.message);
    return res.status(500).json({ error: "Erro interno ao adicionar saldo" });
  } finally {
    client.release();
  }
};

// ======================
// Listar transações
// ======================
exports.listTransactions = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId não informado" });

  try {
    const result = await pool.query(
      "SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro listTransactions:", err.message);
    return res.status(500).json({ error: "Erro interno ao listar transações" });
  }
};
