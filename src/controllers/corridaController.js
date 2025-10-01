// src/controllers/corridaController.js
const pool = require("../db");

// ======================
// CRIAR CORRIDA (passageiro solicita)
// ======================
exports.create = async (req, res) => {
  const { passageiro_id, origem, destino, origemCoords, destinoCoords, valor_estimado, category } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO corridas 
       (passageiro_id, origem, destino, origem_lat, origem_lng, destino_lat, destino_lng, valor_estimado, category, status, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'procurando_motorista',NOW())
       RETURNING *`,
      [
        passageiro_id,
        origem,
        destino,
        origemCoords.latitude,
        origemCoords.longitude,
        destinoCoords.latitude,
        destinoCoords.longitude,
        valor_estimado,
        category || "Flash Plus"
      ]
    );

    const corrida = result.rows[0];
    corrida.motorista = null; // ainda sem motorista

    return res.status(201).json(corrida);
  } catch (err) {
    console.error("Erro ao criar corrida:", err);
    return res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// ======================
// MOTORISTA ACEITA CORRIDA
// ======================
exports.accept = async (req, res) => {
  try {
    const { motorista_id } = req.body;

    const result = await pool.query(
      `UPDATE corridas 
       SET motorista_id = $1, status = 'motorista_a_caminho' 
       WHERE id = $2 RETURNING *`,
      [motorista_id, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];

    // Buscar dados reais do motorista
    const motoristaRes = await pool.query(
      `SELECT id, nome, modelo, placa, categoria FROM motoristas WHERE id = $1`,
      [motorista_id]
    );
    corrida.motorista = motoristaRes.rows[0] || null;

    // Mostrar valor líquido estimado ao motorista (80%)
    corrida.valor_motorista_estimado = corrida.valor_estimado * 0.8;

    return res.json(corrida);
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
      `UPDATE corridas SET status = 'corrida_em_andamento', inicio_em = NOW()
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

    // Atualiza corrida para finalizada
    const corridaResult = await client.query(
      `UPDATE corridas 
       SET status = 'finalizada', fim_em = NOW(), valor_final = $1 
       WHERE id = $2 RETURNING *`,
      [valor_final, corrida_id]
    );

    if (corridaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    const corrida = corridaResult.rows[0];
    const { motorista_id, passageiro_id, forma_pagamento } = corrida;

    // Calcular valores
    const valor_motorista = valor_final * 0.8;
    const valor_plataforma = valor_final * 0.2;

    // Inserir pagamento
    await client.query(
      `INSERT INTO pagamentos 
       (corrida_id, passageiro_id, motorista_id, valor_total, valor_motorista, valor_plataforma, forma_pagamento, data_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [corrida_id, passageiro_id, motorista_id, valor_final, valor_motorista, valor_plataforma, forma_pagamento]
    );

    // Atualizar wallet do motorista
    await client.query(
      `UPDATE wallets SET saldo = saldo + $1 WHERE user_id = $2`,
      [valor_motorista, motorista_id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Corrida finalizada com sucesso",
      corrida,
      valor_motorista,
      valor_plataforma
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao finalizar corrida:", err);
    return res.status(500).json({ error: "Erro ao finalizar corrida" });
  } finally {
    client.release();
  }
};

// ======================
// CANCELAR CORRIDA
// ======================
exports.cancel = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'cancelada', fim_em = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    return res.json({ message: "Corrida cancelada com sucesso", corrida: result.rows[0] });
  } catch (err) {
    console.error("Erro ao cancelar corrida:", err);
    return res.status(500).json({ error: "Erro ao cancelar corrida" });
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
