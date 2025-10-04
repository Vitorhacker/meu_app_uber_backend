const pool = require("../db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");

const PICPAY_CLIENT_ID = process.env.PICPAY_CLIENT_ID;
const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_API_BASE = process.env.PICPAY_API_BASE;
const PICPAY_RETURN_URL = process.env.PICPAY_RETURN_URL;

// ======================
// Função para criptografar dados do cartão
// ======================
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || "minha-chave-super-secreta-32"; // 32 bytes para AES-256
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "utf-8"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// ======================
// Registrar cartão
// ======================
exports.registrarCartao = async (req, res) => {
  try {
    const { passageiroId, numero, mes, ano, cvv, nome } = req.body;

    if (!passageiroId || !numero || !mes || !ano || !cvv || !nome) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // Criptografa dados do cartão
    const numero_enc = encrypt(numero);
    const mes_enc = encrypt(mes);
    const ano_enc = encrypt(ano);
    const cvv_enc = encrypt(cvv);
    const nome_enc = encrypt(nome);

    const card_token = `card_${uuidv4()}`;

    // Salva criptografado
    await pool.query(
      `UPDATE usuarios SET card_token=$1, numero_enc=$2, mes_enc=$3, ano_enc=$4, cvv_enc=$5, nome_enc=$6 WHERE id=$7`,
      [card_token, numero_enc, mes_enc, ano_enc, cvv_enc, nome_enc, passageiroId]
    );

    // ======================
    // Cobrança PicPay automática
    // ======================
    const paymentId = `pay_${uuidv4()}`;
    const payload = {
      referenceId: paymentId,
      callbackUrl: process.env.PICPAY_CALLBACK_URL,
      returnUrl: PICPAY_RETURN_URL,
      value: 1.00, // valor de teste, pode vir do frontend
      buyer: {
        firstName: nome.split(" ")[0],
        lastName: nome.split(" ").slice(1).join(" ") || nome.split(" ")[0],
        document: "00000000000",
        email: "cliente@example.com",
        phone: "11999999999"
      },
      creditCard: {
        number: numero,
        cvc: cvv,
        holderName: nome,
        expirationMonth: mes,
        expirationYear: ano
      }
    };

    const response = await axios.post(`${PICPAY_API_BASE}`, payload, {
      auth: { username: PICPAY_CLIENT_ID, password: PICPAY_CLIENT_SECRET },
      headers: { "Content-Type": "application/json" }
    });

    // Atualiza wallet se pagamento aprovado
    if (response.data.status === "success") {
      await pool.query(
        `UPDATE wallets SET balance = balance + $1 WHERE usuario_id = $2`,
        [payload.value, passageiroId]
      );
    }

    return res.json({
      success: true,
      message: "Cartão registrado e cobrança realizada com sucesso.",
      card_token,
      picpay_status: response.data.status
    });

  } catch (error) {
    console.error("❌ Erro registrarCartao:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro ao registrar cartão ou processar pagamento." });
  }
};

// ======================
// Verificar cartão (somente indica se existe, sem retornar dados)
// ======================
exports.verificarCartao = async (req, res) => {
  try {
    const { passageiroId } = req.params;

    const result = await pool.query(
      "SELECT card_token FROM usuarios WHERE id = $1",
      [passageiroId]
    );

    if (!result.rows.length || !result.rows[0].card_token) {
      return res.json({ possuiCartao: false });
    }

    return res.json({ possuiCartao: true, card_token: result.rows[0].card_token });
  } catch (error) {
    console.error("❌ Erro verificarCartao:", error.message);
    return res.status(500).json({ error: "Erro interno ao verificar cartão." });
  }
};

// ======================
// Remover cartão
// ======================
exports.removerCartao = async (req, res) => {
  try {
    const { passageiroId } = req.body;
    if (!passageiroId) return res.status(400).json({ error: "ID do passageiro é obrigatório." });

    await pool.query(
      "UPDATE usuarios SET card_token = NULL, numero_enc=NULL, mes_enc=NULL, ano_enc=NULL, cvv_enc=NULL, nome_enc=NULL WHERE id = $1",
      [passageiroId]
    );

    return res.json({ success: true, message: "Cartão removido com sucesso." });
  } catch (error) {
    console.error("❌ Erro removerCartao:", error.message);
    return res.status(500).json({ error: "Erro interno ao remover cartão." });
  }
};
