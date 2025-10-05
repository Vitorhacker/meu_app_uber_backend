// src/routes/webhookPagBank.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const crypto = require("crypto");
const axios = require("axios");

// Configuração PagBank
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
const PAGBANK_API_BASE = process.env.PAGBANK_API_BASE;

// ======================
// Função para validar a notificação (SHA256 opcional, pode ser usada depois)
// ======================
function validarNotificacao(headers, body) {
  // Aqui você poderia implementar validação SHA256, se necessário
  // Por enquanto, só conferimos se o token enviado corresponde ao seu token
  if (!headers.authorization || headers.authorization !== `Bearer ${PAGBANK_TOKEN}`) {
    return false;
  }
  return true;
}

// ======================
// Rota webhook
// ======================
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const headers = req.headers;
    const body = req.body;

    if (!validarNotificacao(headers, body)) {
      return res.status(401).json({ error: "Token inválido ou não autorizado." });
    }

    console.log("Webhook PagBank recebido:", body);

    await client.query("BEGIN");

    // Exemplo: corpo padrão para transações
    const {
      id: pagamentoId,
      charges,
      customer,
      reference_id
    } = body;

    if (!charges || !Array.isArray(charges)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Formato inválido da notificação." });
    }

    for (const charge of charges) {
      const { status, amount, payment_method, id: chargeId } = charge;
      const valor = amount?.value || 0;
      const userEmail = customer?.email || "cliente@example.com";

      // Definir status interno
      let statusInterno = "pendente";
      if (status === "PAID") statusInterno = "pago";
      if (status === "CANCELED") statusInterno = "cancelado";
      if (status === "IN_ANALYSIS") statusInterno = "em_analise";

      // Buscar passageiro pelo email (ou outro identificador)
      const resultUser = await client.query(
        "SELECT id FROM usuarios WHERE email=$1",
        [userEmail]
      );

      if (resultUser.rowCount === 0) continue;
      const userId = resultUser.rows[0].id;

      // Atualizar saldo se pago
      if (statusInterno === "pago") {
        await client.query(
          "UPDATE wallets SET balance = balance + $1, updated_at=NOW() WHERE user_id=$2",
          [valor, userId]
        );
      }

      // Inserir transação no histórico
      await client.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at, reference_id, charge_id)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)
         ON CONFLICT (reference_id) DO NOTHING`,
        [userId, valor, payment_method?.type || "desconhecido", statusInterno, reference_id, chargeId]
      );
    }

    await client.query("COMMIT");
    return res.sendStatus(200);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro processando webhook PagBank:", err.message);
    return res.status(500).json({ error: "Erro interno ao processar webhook." });
  } finally {
    client.release();
  }
});

module.exports = router;
