const pool = require("../db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");

// Configurações PagBank
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
const PAGBANK_API_BASE = process.env.PAGBANK_API_BASE;

// ======================
// AES-256-CBC precisa de chave com 32 bytes
// ======================
let key = Buffer.from(process.env.CARD_ENC_KEY_BASE64 || "", "base64");
if (key.length < 32) key = Buffer.concat([key, Buffer.alloc(32 - key.length)]);
if (key.length > 32) key = key.slice(0, 32);
const ENCRYPTION_KEY = key;
const IV_LENGTH = 16;

// ======================
// Função para criptografar dados do cartão
// ======================
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// ======================
// Registrar cartão + cobrança via PagBank
// ======================
exports.registrarCartao = async (req, res) => {
  const client = await pool.connect();
  try {
    const { passageiroId, numero, mes, ano, cvv, nome, valor } = req.body;

    if (!passageiroId || !numero || !mes || !ano || !cvv || !nome || !valor) {
      return res.status(400).json({ error: "Campos obrigatórios faltando.", received: req.body });
    }

    const numero_enc = encrypt(numero);
    const validade_enc = encrypt(`${mes}/${ano}`);
    const cvv_enc = encrypt(cvv);
    const card_token = `card_${uuidv4()}`;

    await client.query("BEGIN");

    // Atualiza cartão no DB
    await client.query(
      `INSERT INTO cartoes (passageiro_id, nome_titular, cpf, numero_enc, validade_enc, cvv_enc)
       VALUES ($1,$2,'00000000000',$3,$4,$5)
       ON CONFLICT (passageiro_id) 
       DO UPDATE SET nome_titular=EXCLUDED.nome_titular, numero_enc=EXCLUDED.numero_enc, validade_enc=EXCLUDED.validade_enc, cvv_enc=EXCLUDED.cvv_enc`,
      [passageiroId, nome, numero_enc, validade_enc, cvv_enc]
    );

    // Criação da cobrança via PagBank
    const paymentId = `pay_${uuidv4()}`;
    const payload = {
      reference_id: paymentId,
      amount: parseFloat(valor),
      payment_method: "credit_card",
      card: {
        number: numero,
        holder_name: nome,
        expiration_month: mes,
        expiration_year: ano,
        cvv: cvv
      },
      customer: {
        name: nome,
        document: "00000000000",
        email: "cliente@example.com",
        phone: "11999999999"
      }
    };

    let pagbank_status = "failed";
    let pagbank_response = null;

    try {
      const response = await axios.post(`${PAGBANK_API_BASE}/v2/transactions`, payload, {
        headers: {
          Authorization: `Bearer ${PAGBANK_TOKEN}`,
          "Content-Type": "application/json"
        }
      });

      pagbank_status = response.data.status;
      pagbank_response = response.data;

      const txStatus = pagbank_status === "paid" ? "pago" : "falha";

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

    } catch (err) {
      console.error("❌ Erro cobrança PagBank:", err.response?.data || err.message);
      await client.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) 
         VALUES ($1, $2, 'cartao', 'falha', NOW())`,
        [passageiroId, valor]
      );
      return res.status(500).json({ error: "Erro ao processar pagamento PagBank.", details: err.response?.data || err.message });
    }

    await client.query("COMMIT");

    return res.json({
      success: pagbank_status === "paid",
      message: pagbank_status === "paid" ? "Cartão registrado e saldo adicionado." : "Cartão registrado, mas cobrança falhou.",
      card_token,
      pagbank_status,
      pagbank_response,
      encrypted_fields: { numero_enc, validade_enc, cvv_enc },
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

// ======================
// Verificar se usuário possui cartão
// ======================
exports.verificarCartao = async (req, res) => {
  const client = await pool.connect();
  try {
    const { passageiroId } = req.params;
    const result = await client.query(
      "SELECT * FROM cartoes WHERE passageiro_id=$1",
      [passageiroId]
    );

    return res.json({ possuiCartao: result.rowCount > 0 });
  } catch (err) {
    console.error("❌ Erro verificarCartao:", err.message);
    return res.status(500).json({ error: "Erro ao verificar cartão." });
  } finally {
    client.release();
  }
};

// ======================
// Remover cartão do usuário
// ======================
exports.removerCartao = async (req, res) => {
  const client = await pool.connect();
  try {
    const { passageiroId } = req.body;

    if (!passageiroId) return res.status(400).json({ error: "passageiroId é obrigatório." });

    await client.query(
      `DELETE FROM cartoes WHERE passageiro_id=$1`,
      [passageiroId]
    );

    return res.json({ success: true, message: "Cartão removido com sucesso." });
  } catch (err) {
    console.error("❌ Erro removerCartao:", err.message);
    return res.status(500).json({ error: "Erro ao remover cartão." });
  } finally {
    client.release();
  }
};
