const axios = require("axios");
const db = require("../db");
const { v4: uuidv4 } = require("uuid");

const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_BASE_URL = "https://appws.picpay.com/ecommerce/public";

// ======================================================
// Registrar cartão e salvar token
// ======================================================
exports.registrarCartao = async (req, res) => {
  try {
    const { passageiroId, numero, mes, ano, cvv, nome } = req.body;

    if (!passageiroId || !numero || !mes || !ano || !cvv || !nome) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const body = {
      cardNumber: numero,
      holderName: nome,
      expirationMonth: mes,
      expirationYear: ano,
      cvv: cvv,
    };

    const response = await axios.post(`${PICPAY_BASE_URL}/cards`, body, {
      headers: { "Content-Type": "application/json", "x-picpay-token": PICPAY_CLIENT_SECRET },
    });

    const data = response.data;

    if (!data.card_token) {
      console.error("Erro registrar cartão:", data);
      return res.status(400).json({ error: "Falha ao registrar cartão no PicPay." });
    }

    await db.execute("UPDATE usuarios SET card_token = ? WHERE id = ?", [data.card_token, passageiroId]);

    return res.json({
      success: true,
      message: "Cartão registrado com sucesso.",
      card_token: data.card_token,
    });
  } catch (error) {
    console.error("Erro registrarCartao:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro interno ao registrar cartão." });
  }
};

// ======================================================
// Consultar cartão do usuário
// ======================================================
exports.consultarCartao = async (req, res) => {
  try {
    const { passageiroId } = req.params;

    const [rows] = await db.execute("SELECT card_token FROM usuarios WHERE id = ?", [passageiroId]);

    if (!rows[0] || !rows[0].card_token) {
      return res.json({ possuiCartao: false });
    }

    return res.json({ possuiCartao: true, card_token: rows[0].card_token });
  } catch (error) {
    console.error("Erro consultarCartao:", error);
    return res.status(500).json({ error: "Erro interno ao consultar cartão." });
  }
};

// ======================================================
// Remover cartão
// ======================================================
exports.removerCartao = async (req, res) => {
  try {
    const { passageiroId } = req.body;
    if (!passageiroId) return res.status(400).json({ error: "ID do passageiro é obrigatório." });

    await db.execute("UPDATE usuarios SET card_token = NULL WHERE id = ?", [passageiroId]);

    return res.json({ success: true, message: "Cartão removido com sucesso." });
  } catch (error) {
    console.error("Erro removerCartao:", error);
    return res.status(500).json({ error: "Erro interno ao remover cartão." });
  }
};
