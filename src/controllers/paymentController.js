const pool = require('../db');
const axios = require('axios');

const PAYMENT_MODE = process.env.PAYMENT_MODE || 'sandbox';
const PICPAY_API_KEY = process.env.PICPAY_API_KEY;
const TEF_API_KEY = process.env.TEF_API_KEY;

async function insertPaymentRecord({ corrida_id, passageiro_id, motorista_id, valor, metodo, provider, transacao_id, status }) {
  const q = `
    INSERT INTO pagamentos (corrida_id, passageiro_id, motorista_id, valor, metodo, provider, transacao_id, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const vals = [corrida_id, passageiro_id, motorista_id, valor, metodo, provider, transacao_id, status];
  const res = await pool.query(q, vals);
  return res.rows[0];
}

exports.checkout = async (req, res) => {
  try {
    const { corrida_id, passageiro_id, motorista_id, valor, metodo, voucher_codigo } = req.body;
    if (!corrida_id || !passageiro_id || !valor || !metodo) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // voucher handling (simple)
    let voucher = null;
    if (metodo === 'voucher' && voucher_codigo) {
      const vq = await pool.query('SELECT * FROM vouchers WHERE codigo = $1 AND ativo = true', [voucher_codigo]);
      if (vq.rows.length === 0) {
        return res.status(400).json({ error: 'Voucher inválido' });
      }
      voucher = vq.rows[0];
      if (parseFloat(voucher.valor) < parseFloat(valor)) {
        // allow partial coverage by voucher? here we assume full cover
      }
    }

    if (PAYMENT_MODE === 'sandbox') {
      // Simulate payment success
      const provider = 'sandbox';
      const transacao_id = 'sandbox_' + Date.now();
      const status = 'pago';
      const record = await insertPaymentRecord({ corrida_id, passageiro_id, motorista_id, valor, metodo, provider, transacao_id, status });
      return res.json({ success: true, payment: record });
    }

    // LIVE mode - call real providers
    if (metodo === 'pix') {
      // Example: call TEF API - this is a placeholder, adapt to real TEF endpoints
      const resp = await axios.post('https://api-tef.example/payments/pix', {
        key: TEF_API_KEY,
        amount: valor,
        reference: corrida_id
      }, { timeout: 15000 });
      const transacao_id = resp.data.id || resp.data.transaction_id || null;
      const status = resp.data.status || 'pendente';
      const record = await insertPaymentRecord({ corrida_id, passageiro_id, motorista_id, valor, metodo, provider: 'tef', transacao_id, status });
      return res.json({ success: true, payment: record, raw: resp.data });
    }

    if (metodo === 'credito' || metodo === 'debito') {
      // Example: PicPay payment creation (placeholder)
      const resp = await axios.post('https://api.picpay.example/payments', {
        apiKey: PICPAY_API_KEY,
        amount: valor,
        method: metodo,
        reference: corrida_id
      }, { timeout: 15000 });
      const transacao_id = resp.data.id || resp.data.transaction_id || null;
      const status = resp.data.status || 'pendente';
      const record = await insertPaymentRecord({ corrida_id, passageiro_id, motorista_id, valor, metodo, provider: 'picpay', transacao_id, status });
      return res.json({ success: true, payment: record, raw: resp.data });
    }

    if (metodo === 'voucher') {
      // mark voucher used (simple)
      await pool.query('UPDATE vouchers SET ativo = false WHERE codigo = $1', [voucher_codigo]);
      const provider = 'voucher';
      const transacao_id = 'voucher_' + voucher_codigo;
      const status = 'pago';
      const record = await insertPaymentRecord({ corrida_id, passageiro_id, motorista_id, valor, metodo, provider, transacao_id, status });
      return res.json({ success: true, payment: record });
    }

    return res.status(400).json({ error: 'Método de pagamento não suportado' });
  } catch (err) {
    console.error('[payment.checkout]', err.toString());
    return res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM pagamentos WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[payment.getStatus]', err);
    return res.status(500).json({ error: 'Erro ao consultar pagamento' });
  }
};
