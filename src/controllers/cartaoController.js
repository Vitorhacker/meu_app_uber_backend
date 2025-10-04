const pool = require("../db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");

const PICPAY_CLIENT_ID = process.env.PICPAY_CLIENT_ID;
const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_API_BASE = process.env.PICPAY_API_BASE || "https://appws.picpay.com/ecommerce/public/payments";
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || "minha-chave-super-secreta-32";
const IV_LENGTH = 16;

// ======================
// Criptografia do cartão
// ======================
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "utf-8"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// ======================
// Registrar cartão + cobrança PicPay
// ======================
exports.registrarCartao = async (req, res) => {
  const client = await pool.connect();

  try {
    const { passageiroId, numero, mes, ano, cvv, nome, valor } = req.body;

    if (!passageiroId || !numero || !mes || !ano || !cvv || !nome || !valor) {
      return res.status(400).json({ error: "Campos obrigatórios faltando.", received: req.body });
    }

    const numero_enc = encrypt(numero);
    const mes_enc = encrypt(mes);
    const ano_enc = encrypt(ano);
    const cvv_enc = encrypt(cvv);
    const nome_enc = encrypt(nome);
    const card_token = `card_${uuidv4()}`;

    await client.query("BEGIN");

    // Atualiza cartão no DB
    try {
      await client.query(
        `UPDATE usuarios 
         SET card_token=$1, numero_enc=$2, mes_enc=$3, ano_enc=$4, cvv_enc=$5, nome_enc=$6 
         WHERE id=$7`,
        [card_token, numero_enc, mes_enc, ano_enc, cvv_enc, nome_enc, passageiroId]
      );
    } catch (dbErr) {
      console.error("❌ Erro DB salvar cartão:", dbErr);
      return res.status(500).json({ error: "Erro ao salvar cartão no DB.", details: dbErr.message });
    }

    // ======================
    // Cobrança PicPay
    // ======================
    const paymentId = `pay_${uuidv4()}`;
    const [firstName, ...lastNameParts] = nome.split(" ");
    const lastName = lastNameParts.join(" ") || firstName;

    const payload = {
      referenceId: paymentId,
      value: parseFloat(valor),
      buyer: { firstName, lastName, document: "00000000000", email: "cliente@example.com", phone: "11999999999" },
      creditCard: { number: numero, cvc: cvv, holderName: nome, expirationMonth: mes, expirationYear: ano }
    };

    let picpay_status = "failed";
    let picpay_response = null;

    try {
      const response = await axios.post(PICPAY_API_BASE, payload, {
        auth: { username: PICPAY_CLIENT_ID, password: PICPAY_CLIENT_SECRET },
        headers: { "Content-Type": "application/json" }
      });

      picpay_status = response.data.status;
      picpay_response = response.data;

      // ======================
      // Consulta status da transação direto no PicPay
      // ======================
      try {
        const check = await axios.get(`${PICPAY_API_BASE}/${paymentId}`, {
          auth: { username: PICPAY_CLIENT_ID, password: PICPAY_CLIENT_SECRET }
        });
        picpay_status = check.data.status;
        picpay_response = check.data;
      } catch (checkErr) {
        console.error("❌ Erro ao consultar status PicPay:", checkErr.response?.data || checkErr.message);
      }

      // Atualiza saldo e transações
      const txStatus = picpay_status === "paid" || picpay_status === "success" ? "pago" : "falha";

      if (txStatus === "pago") {
        await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id=$2`,
          [valor, passageiroId]
        );
      }

      await client.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) 
         VALUES ($1, $2, 'cartao', $3, NOW())`,
        [passageiroId, valor, txStatus]
      );

    } catch (picErr) {
      console.error("❌ Erro cobrança PicPay:", picErr.response?.data || picErr.message);
      await client.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) 
         VALUES ($1, $2, 'cartao', 'falha', NOW())`,
        [passageiroId, valor]
      );
      return res.status(500).json({ error: "Erro ao processar pagamento PicPay.", details: picErr.response?.data || picErr.message });
    }

    await client.query("COMMIT");

    return res.json({
      success: picpay_status === "paid" || picpay_status === "success",
      message: picpay_status === "paid" || picpay_status === "success" 
               ? "Cartão registrado e saldo adicionado." 
               : "Cartão registrado, mas cobrança falhou.",
      card_token,
      picpay_status,
      picpay_response,
      encrypted_fields: { numero_enc, mes_enc, ano_enc, cvv_enc, nome_enc },
      payload_sent: payload
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erro registrarCartao inesperado:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro inesperado ao registrar cartão.", details: error.response?.data || error.message });
  } finally {
    client.release();
  }
};
