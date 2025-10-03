const pool = require("../db");
const { calcularValor, calcularDivisao } = require("../utils/tarifas");

// ======================
// CRIAR CORRIDA
// ======================
exports.create = async (req, res) => {
  const {
    passageiro_id,
    origem,
    destino,
    origemCoords,
    destinoCoords,
    category,
    stops,
    passageiroLocation,
    forma_pagamento,
    valor_estimado,
  } = req.body;

  try {
    // ======================
    // Validar pagamento
    // ======================
    const pagamentoRes = await pool.query(
      "SELECT * FROM pagamentos WHERE corrida_id IS NULL AND passageiro_id = $1 ORDER BY criado_em DESC LIMIT 1",
      [passageiro_id]
    );

    const pagamento = pagamentoRes.rows[0];
    if (!pagamento || (pagamento.status !== "pago" && pagamento.status !== "processando")) {
      return res.status(400).json({ error: "Pagamento não confirmado ou inválido." });
    }

    let distancia_total = 10; // default
    let duracao_total = 20;

    if (stops && stops.length > 0) {
      stops.forEach(() => {
        distancia_total += 2;
        duracao_total += 5;
      });
    }

    // ======================
    // Valor estimado com tarifa atualizada
    // ======================
    const now = new Date();
    const valor_final = valor_estimado || calcularValor(
      category,
      distancia_total,
      duracao_total,
      stops?.length || 0,
      now
    );

    const result = await pool.query(
      `INSERT INTO corridas 
       (passageiro_id, origem, destino, origem_lat, origem_lng, destino_lat, destino_lng, valor_estimado, category, status, criado_em, paradas, distancia, duracao, passageiro_lat, passageiro_lng, forma_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'procurando_motorista',NOW(),$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        passageiro_id,
        origem,
        destino,
        origemCoords.latitude,
        origemCoords.longitude,
        destinoCoords.latitude,
        destinoCoords.longitude,
        valor_final,
        category || "FlashPlus",
        JSON.stringify(stops || []),
        distancia_total,
        duracao_total,
        passageiroLocation?.latitude || origemCoords.latitude,
        passageiroLocation?.longitude || origemCoords.longitude,
        forma_pagamento || "wallet",
      ]
    );

    const corrida = result.rows[0];

    // Atualizar pagamento vinculado
    await pool.query("UPDATE pagamentos SET corrida_id = $1 WHERE id = $2", [corrida.id, pagamento.id]);

    corrida.motorista = null;
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
    const { motorista_id, motoristaLocation } = req.body;

    const result = await pool.query(
      `UPDATE corridas 
       SET motorista_id = $1, status = 'motorista_a_caminho', motorista_lat = $2, motorista_lng = $3
       WHERE id = $4 RETURNING *`,
      [motorista_id, motoristaLocation.latitude, motoristaLocation.longitude, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];

    const motoristaRes = await pool.query(
      `SELECT id, nome, modelo, placa, categoria FROM motoristas WHERE id = $1`,
      [motorista_id]
    );
    corrida.motorista = motoristaRes.rows[0] || null;

    corrida.valor_motorista_estimado = parseFloat((corrida.valor_estimado * 0.8).toFixed(2));

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

    const { distancia, duracao, transaction_id } = req.body;
    const corrida_id = req.params.id;

    const corridaRes = await client.query(`SELECT * FROM corridas WHERE id = $1`, [corrida_id]);
    if (corridaRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    const corrida = corridaRes.rows[0];
    const stops = corrida.paradas ? JSON.parse(corrida.paradas).length : 0;
    const now = new Date();

    const valor_final = calcularValor(
      corrida.category,
      distancia || corrida.distancia,
      duracao || corrida.duracao,
      stops,
      now
    );

    const { valorMotorista: valor_motorista, valorPlataforma: valor_plataforma } = calcularDivisao(valor_final);

    await client.query(
      `UPDATE corridas 
       SET status = 'finalizada', fim_em = NOW(), valor_final = $1, distancia = $2, duracao = $3
       WHERE id = $4`,
      [valor_final, distancia || corrida.distancia, duracao || corrida.duracao, corrida_id]
    );

    await client.query(
      `INSERT INTO pagamentos 
       (corrida_id, passageiro_id, motorista_id, valor_total, valor_motorista, valor_plataforma, forma_pagamento, transaction_id, data_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [corrida_id, corrida.passageiro_id, corrida.motorista_id, valor_final, valor_motorista, valor_plataforma, corrida.forma_pagamento, transaction_id]
    );

    await client.query(
      `UPDATE wallets SET saldo = saldo + $1 WHERE user_id = $2`,
      [valor_motorista, corrida.motorista_id]
    );

    // ======================
    // BUSCAR MOTORISTA PARA RIDE_HISTORY
    // ======================
    let motorista_nome = null;
    let motorista_placa = null;
    if (!corrida.motorista_nome || !corrida.motorista_placa) {
      if (corrida.motorista_id) {
        const motoristaRes = await client.query(
          `SELECT nome, placa FROM motoristas WHERE id = $1`,
          [corrida.motorista_id]
        );
        if (motoristaRes.rows.length > 0) {
          motorista_nome = motoristaRes.rows[0].nome;
          motorista_placa = motoristaRes.rows[0].placa;
        }
      }
    } else {
      motorista_nome = corrida.motorista_nome;
      motorista_placa = corrida.motorista_placa;
    }

    // ======================
    // INSERIR NO RIDE_HISTORY
    // ======================
    await client.query(
      `INSERT INTO ride_history
       (passageiro_id, corrida_id, origem, destino, origem_lat, origem_lng, destino_lat, destino_lng, distancia, duracao, motorista_nome, motorista_placa, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      [
        corrida.passageiro_id,
        corrida.id,
        corrida.origem,
        corrida.destino,
        corrida.origem_lat,
        corrida.origem_lng,
        corrida.destino_lat,
        corrida.destino_lng,
        distancia || corrida.distancia,
        duracao || corrida.duracao,
        motorista_nome,
        motorista_placa,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Corrida finalizada com sucesso",
      corrida: { ...corrida, valor_final },
      valor_motorista,
      valor_plataforma,
      transaction_id,
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

// ======================
// ATUALIZAR LOCALIZAÇÃO EM TEMPO REAL
// ======================
exports.updateLocation = async (req, res) => {
  try {
    const { corrida_id, userType, lat, lng } = req.body;

    const fieldLat = userType === "passageiro" ? "passageiro_lat" : "motorista_lat";
    const fieldLng = userType === "passageiro" ? "passageiro_lng" : "motorista_lng";

    const result = await pool.query(
      `UPDATE corridas SET ${fieldLat}=$1, ${fieldLng}=$2 WHERE id=$3 RETURNING *`,
      [lat, lng, corrida_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    return res.json({ message: "Localização atualizada", corrida: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar localização:", err);
    return res.status(500).json({ error: "Erro ao atualizar localização" });
  }
};

// ======================
// ATUALIZAR FORMA DE PAGAMENTO
// ======================
exports.updatePayment = async (req, res) => {
  try {
    const corridaId = req.params.id;
    const { novaFormaPagamento, passageiro_id } = req.body;

    if (!novaFormaPagamento) {
      return res.status(400).json({ error: "Nova forma de pagamento não fornecida." });
    }

    const corridaRes = await pool.query(`SELECT * FROM corridas WHERE id = $1`, [corridaId]);
    if (corridaRes.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada." });
    }

    const corrida = corridaRes.rows[0];

    if (corrida.status !== "procurando_motorista") {
      return res.status(400).json({ error: "Não é possível alterar o pagamento após iniciar a corrida." });
    }

    if (corrida.passageiro_id !== passageiro_id) {
      return res.status(403).json({ error: "Você não pode alterar o pagamento desta corrida." });
    }

    // Debitar saldo se for wallet
    if (novaFormaPagamento === "wallet") {
      const saldoRes = await pool.query("SELECT saldo FROM wallets WHERE user_id = $1", [passageiro_id]);
      const saldo = saldoRes.rows[0]?.saldo || 0;

      if (saldo < corrida.valor_estimado) {
        return res.status(400).json({ error: "Saldo insuficiente na wallet." });
      }

      await pool.query("UPDATE wallets SET saldo = saldo - $1 WHERE user_id = $2", [corrida.valor_estimado, passageiro_id]);

      if (corr
