const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const db = require("../db");

// Credenciais PicPay
const PICPAY_CLIENT_ID = process.env.PICPAY_CLIENT_ID;
const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_BASE_URL = "https://appws.picpay.com/ecommerce/public";

// ======================================================
// Criar pagamento
// ======================================================
const criarPagamento = async (req, res) => {
  try {
    const { corridaId, metodoPagamento, valor, passageiroId, motoristaId } = req.body;

    if (!corridaId || !metodoPagamento || !valor || !passageiroId || !motoristaId) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

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

    // ----------------- Cartão -----------------
    if (metodoPagamento === "cartao") {
      const [rows] = await db.execute("SELECT card_token FROM usuarios WHERE id = ?", [passageiroId]);
      if (!rows[0]?.card_token) {
        return res.status(400).json({ error: "Usuário não possui cartão cadastrado." });
      }

      const body = {
        referenceId: pagamento.id,
        callbackUrl: process.env.PICPAY_CALLBACK_URL,
        returnUrl: process.env.PICPAY_RETURN_URL,
        value: valor,
        card_token: rows[0].card_token,
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

    // ----------------- Pix -----------------
    if (metodoPagamento === "pix") {
      pagamento.status = "aguardando_pix";
      pagamento.qr_code = `PIX-${pagamento.id}`;
    }

    // ----------------- Wallet -----------------
    if (metodoPagamento === "wallet") {
      const [walletRows] = await db.execute("SELECT id, saldo_atual FROM wallets WHERE passageiro_id = ?", [passageiroId]);
      if (!walletRows[0] || walletRows[0].saldo_atual < valor) {
        return res.status(400).json({ error: "Saldo insuficiente na wallet." });
      }

      const walletId = walletRows[0].id;

      // Debitar passageiro
      await db.execute("UPDATE wallets SET saldo_atual = saldo_atual - ?, ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = ?", [valor, walletId]);
      await db.execute(
        `INSERT INTO wallet_transactions (wallet_id, tipo, valor, metodo, status, referencia, criado_em)
         VALUES (?, 'saida', ?, 'wallet', 'confirmado', ?, CURRENT_TIMESTAMP)`,
        [walletId, valor, `pagamento_corrida_${pagamento.id}`]
      );

      // Creditar motorista
      const [walletMotorista] = await db.execute("SELECT id FROM wallets WHERE passageiro_id = ?", [motoristaId]);
      if (walletMotorista[0]) {
        await db.execute("UPDATE wallets SET saldo_atual = saldo_atual + ?, ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = ?", [valorLiquidoMotorista, walletMotorista[0].id]);
        await db.execute(
          `INSERT INTO wallet_transactions (wallet_id, tipo, valor, metodo, status, referencia, criado_em)
           VALUES (?, 'entrada', ?, 'wallet', 'confirmado', ?, CURRENT_TIMESTAMP)`,
          [walletMotorista[0].id, valorLiquidoMotorista, `pagamento_corrida_${pagamento.id}`]
        );
      }

      pagamento.status = "pago";
    }

    await db.execute("INSERT INTO pagamentos SET ?", pagamento);
    return res.status(201).json({ success: true, pagamento });

  } catch (error) {
    console.error("Erro criarPagamento:", error);
    return res.status(500).json({ error: "Erro interno ao criar pagamento." });
  }
};

// ======================================================
// Consultar status
// ======================================================
const consultarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM pagamentos WHERE id = ?", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Pagamento não encontrado." });
    return res.json({ pagamento: rows[0] });
  } catch (error) {
    console.error("Erro consultarStatus:", error);
    return res.status(500).json({ error: "Erro interno ao consultar pagamento." });
  }
};

// ======================================================
// Confirmar pagamento manual
// ======================================================
const confirmarPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM pagamentos WHERE id = ?", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Pagamento não encontrado." });
    if (rows[0].status === "pago") return res.status(400).json({ error: "Pagamento já confirmado." });

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
const listarPagamentosUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM pagamentos WHERE passageiro_id = ? OR motorista_id = ?", [id, id]);
    return res.json({ pagamentos: rows });
  } catch (error) {
    console.error("Erro listarPagamentosUsuario:", error);
    return res.status(500).json({ error: "Erro interno ao listar pagamentos." });
  }
};

// ======================================================
// Listar todos os pagamentos (Admin)
// ======================================================
const listarTodosPagamentos = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM pagamentos ORDER BY criado_em DESC");
    return res.json({ pagamentos: rows });
  } catch (error) {
    console.error("Erro listarTodosPagamentos:", error);
    return res.status(500).json({ error: "Erro interno ao listar todos os pagamentos." });
  }
};

// ======================================================
// Exportar todos os métodos
// ======================================================
module.exports = {
  criarPagamento,
  consultarStatus,
  confirmarPagamento,
  listarPagamentosUsuario,
  listarTodosPagamentos
};
