// src/controllers/pagamentoController.js
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const db = require('../db');

// Credenciais PicPay vindas do .env
const PICPAY_CLIENT_ID = process.env.PICPAY_CLIENT_ID;
const PICPAY_CLIENT_SECRET = process.env.PICPAY_CLIENT_SECRET;
const PICPAY_BASE_URL = 'https://appws.picpay.com/ecommerce/public';

// ======================================================
// Criar pagamento (Cartão ou Wallet)
// ======================================================
exports.criarPagamento = async (req, res) => {
  try {
    const { corridaId, metodoPagamento, valor, passageiroId, motoristaId } = req.body;

    if (!corridaId || !metodoPagamento || !valor || !passageiroId || !motoristaId) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    // Calcular taxas
    const taxaPlataforma = valor * 0.20;
    const valorLiquidoMotorista = valor - taxaPlataforma;

    let pagamento = {
      id: uuidv4(),
      corrida_id: corridaId,
      passageiro_id: passageiroId,
      motorista_id: motoristaId,
      metodo: metodoPagamento,
      valor_bruto: valor,
      valor_liquido: valorLiquidoMotorista,
      status: 'pendente',
      criado_em: new Date(),
    };

    if (metodoPagamento === 'cartao') {
      // Simula integração PicPay (cria ordem)
      const body = {
        referenceId: pagamento.id,
        callbackUrl: process.env.PICPAY_CALLBACK_URL || 'https://suaapi.com/picpay/callback',
        returnUrl: process.env.PICPAY_RETURN_URL || 'https://seuapp.com/pagamento/retorno',
        value: valor,
        buyer: { id: passageiroId }, // simplificado
      };

      const response = await fetch(`${PICPAY_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-picpay-token': PICPAY_CLIENT_SECRET,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      pagamento.status = 'processando';
      pagamento.transacao_id = data.transactionId || null;
    }

    if (metodoPagamento === 'pix') {
      // Apenas simulação de Pix
      pagamento.status = 'aguardando_pix';
      pagamento.qr_code = `PIX-${pagamento.id}`;
    }

    if (metodoPagamento === 'wallet') {
      // Debitar do saldo do passageiro
      const [passageiro] = await db.query('SELECT saldo FROM usuarios WHERE id = ?', [passageiroId]);
      if (!passageiro || passageiro.saldo < valor) {
        return res.status(400).json({ error: 'Saldo insuficiente na wallet.' });
      }

      await db.query('UPDATE usuarios SET saldo = saldo - ? WHERE id = ?', [valor, passageiroId]);
      await db.query('UPDATE usuarios SET saldo = saldo + ? WHERE id = ?', [valorLiquidoMotorista, motoristaId]);

      pagamento.status = 'pago';
    }

    // Salvar no banco
    await db.query('INSERT INTO pagamentos SET ?', pagamento);

    return res.status(201).json({ success: true, pagamento });
  } catch (error) {
    console.error('Erro criarPagamento:', error);
    return res.status(500).json({ error: 'Erro interno ao criar pagamento.' });
  }
};

// ======================================================
// Consultar status pagamento
// ======================================================
exports.consultarStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [pagamento] = await db.query('SELECT * FROM pagamentos WHERE id = ?', [id]);
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado.' });
    }

    return res.json({ pagamento });
  } catch (error) {
    console.error('Erro consultarStatus:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar pagamento.' });
  }
};

// ======================================================
// Confirmar pagamento manual (se precisar)
// ======================================================
exports.confirmarPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const [pagamento] = await db.query('SELECT * FROM pagamentos WHERE id = ?', [id]);
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado.' });
    }

    if (pagamento.status === 'pago') {
      return res.status(400).json({ error: 'Pagamento já confirmado.' });
    }

    await db.query('UPDATE pagamentos SET status = ? WHERE id = ?', ['pago', id]);

    return res.json({ success: true, message: 'Pagamento confirmado.' });
  } catch (error) {
    console.error('Erro confirmarPagamento:', error);
    return res.status(500).json({ error: 'Erro interno ao confirmar pagamento.' });
  }
};

// ======================================================
// Listar pagamentos de um usuário
// ======================================================
exports.listarPagamentosUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const pagamentos = await db.query('SELECT * FROM pagamentos WHERE passageiro_id = ? OR motorista_id = ?', [id, id]);

    return res.json({ pagamentos });
  } catch (error) {
    console.error('Erro listarPagamentosUsuario:', error);
    return res.status(500).json({ error: 'Erro interno ao listar pagamentos.' });
  }
};

// ======================================================
// Listar todos os pagamentos (Admin)
// ======================================================
exports.listarTodosPagamentos = async (req, res) => {
  try {
    const pagamentos = await db.query('SELECT * FROM pagamentos ORDER BY criado_em DESC');

    return res.json({ pagamentos });
  } catch (error) {
    console.error('Erro listarTodosPagamentos:', error);
    return res.status(500).json({ error: 'Erro interno ao listar todos os pagamentos.' });
  }
};
