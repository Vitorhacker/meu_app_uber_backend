const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const db = require("../db");

// Credenciais PicPay vindas do .env
const PICPAY_CLIENT_ID = process.env.PICPAY_CLIENT_ID;
const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_BASE_URL = "https://appws.picpay.com/ecommerce/public";

// ======================================================
// Criar pagamento (Cartão / Wallet / Pix)
// ======================================================
exports.criarPagamento = async (req, res) => {
  try {
    const { corridaId, metodoPagamento, valor, passageiroId, motoristaId } = req.body;

    if (!corridaId || !metodoPagamento || !valor || !passageiroId || !motoristaId) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // Taxa da plataforma (20%)
    const taxaPlataforma = valor * 0.2;
    const valorLiquidoMotorista = valor - taxaPlataforma;

    let pagamento = {
      id: uuidv4(),
      corrida_id: corridaId,
      passageiro_id: passageiroId,
      motorista_id: motoristaId,
      metodo: metodoPagamento,
      valor_bruto: valor,
      valor_liquido: valorLiquidoMotorista,
      status: "pendente",
      criado_em: new Date(),
    };

    // ======================================================
    // PAGAMENTO CARTÃO (PicPay ou simulado)
    // ======================================================
    if (metodoPagamento === "cartao") {
      const body = {
        referenceId: pagamento.id,
        callbackUrl: process.env.PICPAY_CALLBACK_URL || "https://suaapi.com/picpay/callback",
        returnUrl: process.env.PICPAY_RETURN_URL || "https://seuapp.com/pagamento/retorno",
        value: valor,
        buyer: { id: passageiroId },
      };

      const response = await fetch(`${PICPAY_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-picpay-token": PICPAY_CLIENT_SECRET,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      pagamento.status = "processando";
      pagamento.transacao_id = data.transactionId || null;
    }

    // ======================================================
    // PAGAMENTO PIX (simulado)
    // ======================================================
    if (metodoPagamento === "pix") {
      pagamento.status = "aguardando_pix";
      pagamento.qr_code = `PIX-${pagamento.id}`;
    }

    // ======================================================
    // PAGAMENTO WALLET (saldo interno)
    // ======================================================
    if (metodoPagamento === "wallet") {
      const [rows] = await db.execute("SELECT saldo FROM usuarios WHERE id = ?", [passageiroId]);
      if (!rows[0] || rows[0].saldo < valor) {
        return res.status(400).json({ error: "Saldo insuficiente na wallet." });
      }

      await db.execute("UPDATE usuarios SET saldo = saldo - ? WHERE id = ?", [valor, passageiroId]);
      await db.execute("UPDATE usuarios SET saldo = saldo + ? WHERE id = ?", [valorLiquidoMotorista, motoristaId]);

      pagamento.status = "pago";
    }

    // Salvar no banco
    await db.execute("INSERT INTO pagamentos SET ?", pagamento);

    return res.status(201).json({ success: true, pagamento });
  } catch (error) {
    console.error("Erro criarPagamento:", error);
    return res.status(500).json({ error: "Erro interno ao criar pagamento." });
  }
};

// ======================================================
// Consultar status pagamento
// ======================================================
exports.consultarStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute("SELECT * FROM pagamentos WHERE id = ?", [id]);
    if (!rows[0]) {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }

    return res.json({ pagamento: rows[0] });
  } catch (error) {
    console.error("Erro consultarStatus:", error);
    return res.status(500).json({ error: "Erro interno ao consultar pagamento." });
  }
};

// ======================================================
// Confirmar pagamento manual (admin)
// ======================================================
exports.confirmarPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute("SELECT * FROM pagamentos WHERE id = ?", [id]);
    if (!rows[0]) {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }

    if (rows[0].status === "pago") {
      return res.status(400).json({ error: "Pagamento já confirmado." });
    }

    await db.execute("UPDATE pagamentos SET status = 'pago' WHERE id = ?", [id]);

    return res.json({ success: true, message: "Pagamento confirmado." });
  } catch (error) {
    console.error("Erro confirmarPagamento:", error);
    return res.status(500).json({ error: "Erro interno ao confirmar pagamento." });
  }
};

// ======================================================
// Listar pagamentos de um usuário
// ======================================================
exports.listarPagamentosUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT * FROM pagamentos WHERE passageiro_id = ? OR motorista_id = ?",
      [id, id]
    );

    return res.json({ pagamentos: rows });
  } catch (error) {
    console.error("Erro listarPagamentosUsuario:", error);
    return res.status(500).json({ error: "Erro interno ao listar pagamentos." });
  }
};

// ======================================================
// Listar todos os pagamentos (Admin)
// ======================================================
exports.listarTodosPagamentos = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM pagamentos ORDER BY criado_em DESC");
    return res.json({ pagamentos: rows });
  } catch (error) {
    console.error("Erro listarTodosPagamentos:", error);
    return res.status(500).json({ error: "Erro interno ao listar todos os pagamentos." });
  }
};
