const pool = require("../db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");

const PICPAY_CLIENT_ID = process.env.PICPAY_CLIENT_ID;
const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_API_BASE = process.env.PICPAY_API_BASE;
const PICPAY_RETURN_URL = process.env.PICPAY_RETURN_URL;
const PICPAY_CALLBACK_URL = process.env.PICPAY_CALLBACK_URL;

// ======================
// Criptografia do cartão
// ======================
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || "minha-chave-super-secreta-32"; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "utf-8"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// ======================
// Registrar cartão e cobrar via PicPay
// ======================
exports.registrarCartao = async (req, res) => {
  const client = await pool.connect();
  try {
    const { passageiroId, numero, mes, ano, cvv, nome, valor } = req.body;

    if (!passageiroId || !numero || !mes || !ano || !cvv || !nome || !valor) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // Criptografa os dados do cartão
    const numero_enc = encrypt(numero);
    const mes_enc = encrypt(mes);
    const ano_enc = encrypt(ano);
    const cvv_enc = encrypt(cvv);
    const nome_enc = encrypt(nome);

    const card_token = `card_${uuidv4()}`;

    await client.query("BEGIN");

    // Salva o cartão criptografado
    await client.query(
      `UPDATE usuarios 
       SET card_token=$1, numero_enc=$2, mes_enc=$3, ano_enc=$4, cvv_enc=$5, nome_enc=$6 
       WHERE id=$7`,
      [card_token, numero_enc, mes_enc, ano_enc, cvv_enc, nome_enc, passageiroId]
    );

    // ======================
    // Cobrança via PicPay
    // ======================
    const paymentId = `pay_${uuidv4()}`;
    const [firstName, ...lastNameParts] = nome.split(" ");
    const lastName = lastNameParts.join(" ") || firstName;

    const payload = {
      referenceId: paymentId,
      callbackUrl: PICPAY_CALLBACK_URL,
      returnUrl: PICPAY_RETURN_URL,
      value: parseFloat(valor),
      buyer: {
        firstName,
        lastName,
        document: "00000000000", // ideal: trazer do cadastro do usuário
        email: "cliente@example.com", // ideal: trazer do cadastro
        phone: "11999999999" // ideal: trazer do cadastro
      },
      creditCard: {
        number: numero,
        cvc: cvv,
        holderName: nome,
        expirationMonth: mes,
        expirationYear: ano
      }
    };

    let picpay_status = "failed";

    try {
      const response = await axios.post(`${PICPAY_API_BASE}`, payload, {
        auth: { username: PICPAY_CLIENT_ID, password: PICPAY_CLIENT_SECRET },
        headers: { "Content-Type": "application/json" }
      });

      picpay_status = response.data.status;

      if (picpay_status === "success") {
        // Atualiza carteira
        await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id=$2`,
          [valor, passageiroId]
        );

        await client.query(
          `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) 
           VALUES ($1, $2, 'cartao', 'pago', NOW())`,
          [passageiroId, valor]
        );
      } else {
        await client.query(
          `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) 
           VALUES ($1, $2, 'cartao', 'falha', NOW())`,
          [passageiroId, valor]
        );
      }

    } catch (err) {
      console.error("❌ Erro cobrança PicPay:", err.response?.data || err.message);
      // Marca como falha na transação
      await client.query(
        `INSERT INTO wallet_transactions (user_id, valor, metodo, status, created_at) 
         VALUES ($1, $2, 'cartao', 'falha', NOW())`,
        [passageiroId, valor]
      );
    }

    await client.query("COMMIT");

    return res.json({
      success: picpay_status === "success",
      message: picpay_status === "success" 
               ? "Cartão registrado e saldo adicionado com sucesso." 
               : "Cartão registrado, mas a cobrança falhou.",
      card_token,
      picpay_status
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erro registrarCartao:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro ao registrar cartão ou processar pagamento." });
  } finally {
    client.release();
  }
};

// ======================
// Verificar cartão
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
      "UPDATE usuarios SET card_token=NULL, numero_enc=NULL, mes_enc=NULL, ano_enc=NULL, cvv_enc=NULL, nome_enc=NULL WHERE id=$1",
      [passageiroId]
    );

    return res.json({ success: true, message: "Cartão removido com sucesso." });
  } catch (error) {
    console.error("❌ Erro removerCartao:", error.message);
    return res.status(500).json({ error: "Erro interno ao remover cartão." });
  }
};
