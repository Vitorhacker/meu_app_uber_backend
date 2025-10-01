const pool = require("../db");
const { sendNotificationMotorista } = require("../services/notificationService");

// Criar corrida
exports.create = async (req, res) => {
  const { passageiro_id, origem, destino, valor_estimado } = req.body;

  try {
    const q = `
      INSERT INTO corridas (passageiro_id, origem, destino, valor_estimado, status, created_at)
      VALUES ($1, $2, $3, $4, 'pendente', NOW())
      RETURNING *;
    `;
    const r = await pool.query(q, [passageiro_id, origem, destino, valor_estimado]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Erro create corrida:", err);
    res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// Listar corridas
exports.list = async (_req, res) => {
  try {
    const q = "SELECT * FROM corridas ORDER BY created_at DESC";
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error("❌ Erro list corridas:", err);
    res.status(500).json({ error: "Erro ao listar corridas" });
  }
};

// Buscar corrida por ID
exports.get = async (req, res) => {
  const { id } = req.params;
  try {
    const q = "SELECT * FROM corridas WHERE id = $1";
    const r = await pool.query(q, [id]);

    if (r.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Erro get corrida:", err);
    res.status(500).json({ error: "Erro ao buscar corrida" });
  }
};

// Atribuir motorista
exports.assignDriver = async (req, res) => {
  const { id } = req.params;
  const { motorista_id } = req.body;

  try {
    const q = `
      UPDATE corridas
      SET motorista_id = $1, status = 'aceita'
      WHERE id = $2
      RETURNING *;
    `;
    const r = await pool.query(q, [motorista_id, id]);

    if (r.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Erro assignDriver:", err);
    res.status(500).json({ error: "Erro ao atribuir motorista" });
  }
};

// Iniciar corrida
exports.start = async (req, res) => {
  const { id } = req.params;

  try {
    const q = `
      UPDATE corridas
      SET status = 'em_andamento', inicio_corrida = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const r = await pool.query(q, [id]);

    if (r.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Erro start corrida:", err);
    res.status(500).json({ error: "Erro ao iniciar corrida" });
  }
};

// Finalizar corrida (atualiza corrida, cria pagamento, soma carteira, notifica motorista)
exports.finish = async (req, res) => {
  const { id } = req.params;
  const { valor_final, metodo = "carteira" } = req.body;

  try {
    await pool.query("BEGIN");

    // Atualizar corrida
    const corridaQ = `
      UPDATE corridas
      SET status = 'finalizada', fim_corrida = NOW(), valor_final = $1
      WHERE id = $2
      RETURNING *;
    `;
    const corridaR = await pool.query(corridaQ, [valor_final, id]);
    if (corridaR.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Corrida não encontrada" });
    }
    const corrida = corridaR.rows[0];

    // Calcular valores
    const valorPlataforma = parseFloat(valor_final) * 0.2;
    const valorMotorista = parseFloat(valor_final) - valorPlataforma;

    // Criar pagamento
    const pagamentoQ = `
      INSERT INTO pagamentos (
        corrida_id, passageiro_id, motorista_id,
        valor_total, valor_motorista, valor_plataforma,
        metodo, status, transacao_id, data_pagamento, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente',$8,NOW(),NOW())
      RETURNING *;
    `;
    const pagamentoR = await pool.query(pagamentoQ, [
      corrida.id,
      corrida.passageiro_id,
      corrida.motorista_id,
      valor_final,
      valorMotorista,
      valorPlataforma,
      metodo,
      `TRANS-${Date.now()}`
    ]);
    const pagamento = pagamentoR.rows[0];

    // Atualizar carteira do motorista
    const carteiraQ = `
      UPDATE motoristas
      SET saldo_carteira = saldo_carteira + $1
      WHERE id = $2
      RETURNING id, nome, saldo_carteira, push_token;
    `;
    const motoristaR = await pool.query(carteiraQ, [valorMotorista, corrida.motorista_id]);
    const motorista = motoristaR.rows[0];

    await pool.query("COMMIT");

    // Notificação para motorista
    if (motorista && motorista.push_token) {
      await sendNotificationMotorista(
        motorista.push_token,
        "Corrida finalizada ✅",
        `Você recebeu R$ ${valorMotorista.toFixed(2)} na sua carteira.`
      );
    }

    res.json({ corrida, pagamento, motorista });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Erro finish corrida:", err);
    res.status(500).json({ error: "Erro ao finalizar corrida" });
  }
};

// Salvar push token do motorista
exports.savePushToken = async (req, res) => {
  const { id } = req.params; // motorista_id
  const { pushToken } = req.body;

  if (!pushToken) {
    return res.status(400).json({ error: "pushToken é obrigatório." });
  }

  try {
    const q = `
      UPDATE motoristas
      SET push_token = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nome, push_token;
    `;
    const r = await pool.query(q, [pushToken, id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Motorista não encontrado." });
    }

    res.json({ success: true, motorista: r.rows[0] });
  } catch (err) {
    console.error("❌ Erro savePushToken:", err);
    res.status(500).json({ error: "Erro ao salvar push token" });
  }
};

// Enviar notificação manual (teste)
exports.notifyMotorista = async (req, res) => {
  const { pushToken, title, body } = req.body;

  if (!pushToken || !title || !body) {
    return res.status(400).json({ error: "pushToken, title e body são obrigatórios" });
  }

  try {
    await sendNotificationMotorista(pushToken, title, body);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro notifyMotorista:", err);
    res.status(500).json({ error: "Erro ao enviar notificação" });
  }
};
