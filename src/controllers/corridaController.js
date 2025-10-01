// src/controllers/corridaController.js
const pool = require("../db");

// ======================
// CRIAR CORRIDA (passageiro solicita)
// ======================
exports.create = async (req, res) => {
  const { passageiro_id, origem, destino, forma_pagamento, valor_estimado } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO corridas (passageiro_id, origem, destino, forma_pagamento, valor_estimado, status, criado_em)
       VALUES ($1, $2, $3, $4, $5, 'pendente', NOW())
       RETURNING *`,
      [passageiro_id, origem, destino, forma_pagamento, valor_estimado]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar corrida:", err);
    return res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// ======================
// PASSAGEIRO OU MOTORISTA CANCELA
// ======================
exports.cancel = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'cancelada', fim_em = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cancelar corrida:", err);
    return res.status(500).json({ error: "Erro ao cancelar corrida" });
  }
};

// ======================
// MOTORISTA ACEITA
// ======================
exports.accept = async (req, res) => {
  try {
    const { motorista_id } = req.body;

    const result = await pool.query(
      `UPDATE corridas SET motorista_id = $1, status = 'aceita'
       WHERE id = $2 RETURNING *`,
      [motorista_id, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao aceitar corrida:", err);
    return res.status(500).json({ error: "Erro ao aceitar corrida" });
  }
};

// ======================
// INICIAR CORRIDA
// ======================
exports.start = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'em_andamento', inicio_em = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao iniciar corrida:", err);
    return res.status(500).json({ error: "Erro ao iniciar corrida" });
  }
};

// ======================
// FINALIZAR CORRIDA
// ======================
exports.finish = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { valor_final } = req.body;
    const corrida_id = req.params.id;

    const corridaResult = await client.query(
      `UPDATE corridas SET status = 'finalizada', fim_em = NOW(), valor_final = $1
       WHERE id = $2 RETURNING *`,
      [valor_final, corrida_id]
    );
    if (corridaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    const corrida = corridaResult.rows[0];
    const { motorista_id, passageiro_id, forma_pagamento } = corrida;

    const valor_motorista = valor_final * 0.8;
    const valor_plataforma = valor_final * 0.2;

    await client.query(
      `INSERT INTO pagamentos (corrida_id, passageiro_id, motorista_id, valor_total, valor_motorista, valor_plataforma, forma_pagamento, data_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [corrida_id, passageiro_id, motorista_id, valor_final, valor_motorista, valor_plataforma, forma_pagamento]
    );

    await client.query(
      `UPDATE wallets SET saldo = saldo + $1 WHERE user_id = $2`,
      [valor_motorista, motorista_id]
    );

    await client.query("COMMIT");
    return res.json({ message: "Corrida finalizada com sucesso", corrida });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao finalizar corrida:", err);
    return res.status(500).json({ error: "Erro ao finalizar corrida" });
  } finally {
    client.release();
  }
};

// ======================
// LISTAR CORRIDAS DE UM PASSAGEIRO
// ======================
exports.getByPassenger = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM corridas WHERE passageiro_id = $1 ORDER BY criado_em DESC`,
      [req.params.passageiro_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar corridas do passageiro:", err);
    return res.status(500).json({ error: "Erro ao listar corridas do passageiro" });
  }
};

// ======================
// LISTAR CORRIDAS DE UM MOTORISTA
// ======================
exports.getByDriver = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM corridas WHERE motorista_id = $1 ORDER BY criado_em DESC`,
      [req.params.motorista_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar corridas do motorista:", err);
    return res.status(500).json({ error: "Erro ao listar corridas do motorista" });
  }
};
