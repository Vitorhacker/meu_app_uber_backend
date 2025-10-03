// src/controllers/walletController.js
const pool = require("../db");
const { v4: uuidv4 } = require("uuid");

// ======================
// OBTER SALDO
// ======================
exports.getBalance = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query("SELECT balance, reserved, currency, updated_at FROM wallets WHERE user_id = $1", [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Wallet não encontrada" });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro getBalance:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
};

// ======================
// ADICIONAR SALDO
// ======================
exports.addBalance = async (req, res) => {
  const { userId, valor, metodo } = req.body;

  if (!userId || !valor || !metodo) return res.status(400).json({ error: "Campos obrigatórios faltando" });
  if (valor < 20 || valor > 300) return res.status(400).json({ error: "Valor deve estar entre R$ 20 e R$ 300" });

  try {
    if (metodo === "pix") {
      // Gera QR Code simulado
      const qr_code = `PIX-${uuidv4()}`; // normalmente seria string do Pix real
      await pool.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at, qr_code) VALUES ($1,$2,$3,'pendente',NOW(),$4)`,
        [userId, valor, metodo, qr_code]
      );
      return res.json({ success: true, qr_code });
    }

    if (metodo === "cartao") {
      // Para simulação, apenas credita direto
      await pool.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [valor, userId]
      );

      await pool.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) VALUES ($1,$2,'cartao','pago',NOW())`,
        [userId, valor]
      );

      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Método de pagamento inválido" });
  } catch (err) {
    console.error("Erro addBalance:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
};

// ======================
// CONFIRMAR PIX
// ======================
exports.confirmPix = async (req, res) => {
  const { userId, qrCodeData } = req.body;
  if (!userId || !qrCodeData) return res.status(400).json({ error: "Dados obrigatórios faltando" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verifica a transação pendente pelo QR Code
    const txRes = await client.query(
      `SELECT * FROM wallet_transactions WHERE user_id=$1 AND qr_code=$2 AND status='pendente'`,
      [userId, qrCodeData]
    );

    if (txRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Transação PIX não encontrada" });
    }

    const tx = txRes.rows[0];

    // Atualiza wallet
    await client.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
      [tx.valor, userId]
    );

    // Marca transação como paga
    await client.query(`UPDATE wallet_transactions SET status='pago', confirmed_at=NOW() WHERE id=$1`, [tx.id]);

    await client.query("COMMIT");
    return res.json({ success: true, novo_saldo: tx.valor });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro confirmPix:", err);
    return res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
};

// ======================
// LISTAR TRANSACOES
// ======================
exports.listTransactions = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC`, [userId]);
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro listTransactions:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
};
