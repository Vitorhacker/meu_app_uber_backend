const pool = require("../db");
const { v4: uuidv4 } = require("uuid");

// ======================================================
// Registrar cartão do usuário
// ======================================================
exports.registrarCartao = async (req, res) => {
  try {
    const { passageiroId, numero, mes, ano, cvv, nome } = req.body;

    if (!passageiroId || !numero || !mes || !ano || !cvv || !nome) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const card_token = `card_${uuidv4()}`;

    // Salva o token diretamente na tabela usuarios (ou cartoes se quiser múltiplos)
    await pool.query(
      `UPDATE usuarios SET card_token = $1 WHERE id = $2`,
      [card_token, passageiroId]
    );

    return res.json({
      success: true,
      message: "Cartão registrado com sucesso.",
      card_token,
    });
  } catch (error) {
    console.error("❌ Erro registrarCartao:", error.message);
    return res.status(500).json({ error: "Erro interno ao registrar cartão." });
  }
};

// ======================================================
// Verificar se o usuário possui cartão
// ======================================================
exports.verificarCartao = async (req, res) => {
  try {
    const { passageiroId } = req.params;

    if (!passageiroId)
      return res.status(400).json({ error: "ID do passageiro é obrigatório." });

    const result = await pool.query(
      "SELECT card_token FROM usuarios WHERE id = $1",
      [passageiroId]
    );

    if (!result.rows.length || !result.rows[0].card_token) {
      return res.json({ possuiCartao: false });
    }

    return res.json({
      possuiCartao: true,
      card_token: result.rows[0].card_token,
    });
  } catch (error) {
    console.error("❌ Erro verificarCartao:", error.message);
    return res.status(500).json({ error: "Erro interno ao verificar cartão." });
  }
};

// ======================================================
// Remover cartão do usuário
// ======================================================
exports.removerCartao = async (req, res) => {
  try {
    const { passageiroId } = req.body;
    if (!passageiroId)
      return res.status(400).json({ error: "ID do passageiro é obrigatório." });

    await pool.query(
      "UPDATE usuarios SET card_token = NULL WHERE id = $1",
      [passageiroId]
    );

    return res.json({
      success: true,
      message: "Cartão removido com sucesso.",
    });
  } catch (error) {
    console.error("❌ Erro removerCartao:", error.message);
    return res.status(500).json({ error: "Erro interno ao remover cartão." });
  }
};
