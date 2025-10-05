const pool = require("../db");
const { calcularValor } = require("../utils/tarifas");

// ======================
// CRIAR CORRIDA
// ======================
exports.create = async (req, res) => {
  console.log("====== NOVA REQUISIÇÃO DE CORRIDA ======");
  console.log("Corpo recebido:", req.body);

  const {
    passageiro_id,
    origem,
    destino,
    origemCoords,
    destinoCoords,
    category,
    stops,
    passageiroLocation,
    valor_estimado,
  } = req.body;

  // Validações básicas
  if (!passageiro_id) return res.status(400).json({ error: "Campo passageiro_id é obrigatório" });
  if (!origem || !destino) return res.status(400).json({ error: "Campos origem e destino são obrigatórios" });
  if (!origemCoords || origemCoords.latitude == null || origemCoords.longitude == null)
    return res.status(400).json({ error: "Campo origemCoords inválido" });
  if (!destinoCoords || destinoCoords.latitude == null || destinoCoords.longitude == null)
    return res.status(400).json({ error: "Campo destinoCoords inválido" });
  if (!category) return res.status(400).json({ error: "Campo category é obrigatório" });

  try {
    let distancia_total = 10;
    let duracao_total = 20;

    if (stops && stops.length > 0) stops.forEach(() => { distancia_total += 2; duracao_total += 5; });

    const now = new Date();
    const valor_final = valor_estimado || calcularValor(category, distancia_total, duracao_total, stops?.length || 0, now);

    console.log("Valores calculados:", { distancia_total, duracao_total, valor_final });

    const result = await pool.query(
      `INSERT INTO corridas 
       (passageiro_id, origem, destino, origem_lat, origem_lng, destino_lat, destino_lng, valor_estimado, category, status, criado_em, paradas, distancia, duracao, passageiro_lat, passageiro_lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'procurando_motorista',NOW(),$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        passageiro_id, origem, destino,
        origemCoords.latitude, origemCoords.longitude,
        destinoCoords.latitude, destinoCoords.longitude,
        valor_final, category,
        JSON.stringify(stops || []),
        distancia_total, duracao_total,
        passageiroLocation?.latitude || origemCoords.latitude,
        passageiroLocation?.longitude || origemCoords.longitude,
      ]
    );

    const corrida = result.rows[0];
    corrida.motorista = null;

    console.log("Corrida criada com sucesso:", corrida);
    return res.status(201).json(corrida);
  } catch (err) {
    console.error("Erro ao criar corrida:", err);
    return res.status(500).json({ error: "Erro ao criar corrida", details: err.message });
  }
};

// ======================
// MOTORISTA ACEITA CORRIDA
// ======================
exports.accept = async (req, res) => {
  console.log("====== MOTORISTA ACEITANDO CORRIDA ======");
  console.log("Params:", req.params, "Body:", req.body);

  try {
    const { motorista_id, motoristaLocation } = req.body;
    if (!motorista_id) return res.status(400).json({ error: "motorista_id é obrigatório" });
    if (!motoristaLocation || motoristaLocation.latitude == null || motoristaLocation.longitude == null)
      return res.status(400).json({ error: "motoristaLocation inválido" });

    const result = await pool.query(
      `UPDATE corridas 
       SET motorista_id = $1, status = 'motorista_a_caminho', motorista_lat = $2, motorista_lng = $3
       WHERE id = $4 RETURNING *`,
      [motorista_id, motoristaLocation.latitude, motoristaLocation.longitude, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    const motoristaRes = await pool.query(`SELECT id, nome, modelo, placa, categoria FROM motoristas WHERE id = $1`, [motorista_id]);
    corrida.motorista = motoristaRes.rows[0] || null;
    corrida.valor_motorista_estimado = parseFloat((corrida.valor_estimado * 0.8).toFixed(2));

    console.log("Corrida atualizada com motorista:", corrida);
    return res.json(corrida);
  } catch (err) {
    console.error("Erro ao aceitar corrida:", err);
    return res.status(500).json({ error: "Erro ao aceitar corrida", details: err.message });
  }
};

// ======================
// INICIAR CORRIDA
// ======================
exports.start = async (req, res) => {
  console.log("====== INICIAR CORRIDA ======");
  console.log("Params:", req.params);

  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'corrida_em_andamento', inicio_em = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    console.log("Corrida iniciada:", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao iniciar corrida:", err);
    return res.status(500).json({ error: "Erro ao iniciar corrida", details: err.message });
  }
};

// ======================
// FINALIZAR CORRIDA
// ======================
exports.finish = async (req, res) => {
  console.log("====== FINALIZAR CORRIDA ======");
  console.log("Params:", req.params, "Body:", req.body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { distancia, duracao } = req.body;
    const corrida_id = req.params.id;

    const corridaRes = await client.query(`SELECT * FROM corridas WHERE id = $1`, [corrida_id]);
    if (corridaRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    const corrida = corridaRes.rows[0];
    const stops = corrida.paradas ? JSON.parse(corrida.paradas).length : 0;
    const now = new Date();

    const valor_final = calcularValor(corrida.category, distancia || corrida.distancia, duracao || corrida.duracao, stops, now);

    await client.query(
      `UPDATE corridas SET status = 'finalizada', fim_em = NOW(), valor_final = $1, distancia = $2, duracao = $3 WHERE id = $4`,
      [valor_final, distancia || corrida.distancia, duracao || corrida.duracao, corrida_id]
    );

    await client.query(
      `INSERT INTO ride_history
       (passageiro_id, corrida_id, origem, destino, origem_lat, origem_lng, destino_lat, destino_lng, distancia, duracao, motorista_nome, motorista_placa, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      [
        corrida.passageiro_id, corrida.id, corrida.origem, corrida.destino,
        corrida.origem_lat, corrida.origem_lng, corrida.destino_lat, corrida.destino_lng,
        distancia || corrida.distancia, duracao || corrida.duracao,
        corrida.motorista?.nome, corrida.motorista?.placa
      ]
    );

    await client.query("COMMIT");

    console.log("Corrida finalizada com sucesso:", corrida);
    return res.json({ message: "Corrida finalizada com sucesso", corrida: { ...corrida, valor_final } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao finalizar corrida:", err);
    return res.status(500).json({ error: "Erro ao finalizar corrida", details: err.message });
  } finally {
    client.release();
  }
};

// ======================
// CANCELAR CORRIDA
// ======================
exports.cancel = async (req, res) => {
  console.log("====== CANCELAR CORRIDA ======");
  console.log("Params:", req.params);

  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'cancelada', fim_em = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    console.log("Corrida cancelada com sucesso:", result.rows[0]);
    return res.json({ message: "Corrida cancelada com sucesso", corrida: result.rows[0] });
  } catch (err) {
    console.error("Erro ao cancelar corrida:", err);
    return res.status(500).json({ error: "Erro ao cancelar corrida", details: err.message });
  }
};

// ======================
// LISTAR CORRIDAS DE UM PASSAGEIRO
// ======================
exports.getByPassenger = async (req, res) => {
  console.log("====== LISTAR CORRIDAS DE PASSAGEIRO ======");
  console.log("Params:", req.params);

  try {
    const result = await pool.query(
      `SELECT * FROM corridas WHERE passageiro_id = $1 ORDER BY criado_em DESC`,
      [req.params.passageiro_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar corridas do passageiro:", err);
    return res.status(500).json({ error: "Erro ao listar corridas do passageiro", details: err.message });
  }
};

// ======================
// LISTAR CORRIDAS DE UM MOTORISTA
// ======================
exports.getByDriver = async (req, res) => {
  console.log("====== LISTAR CORRIDAS DE MOTORISTA ======");
  console.log("Params:", req.params);

  try {
    const result = await pool.query(
      `SELECT * FROM corridas WHERE motorista_id = $1 ORDER BY criado_em DESC`,
      [req.params.motorista_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar corridas do motorista:", err);
    return res.status(500).json({ error: "Erro ao listar corridas do motorista", details: err.message });
  }
};

// ======================
// ATUALIZAR LOCALIZAÇÃO EM TEMPO REAL
// ======================
exports.updateLocation = async (req, res) => {
  console.log("====== ATUALIZAR LOCALIZAÇÃO ======");
  console.log("Body recebido:", req.body);

  try {
    const { corrida_id, userType, lat, lng } = req.body;

    if (!corrida_id || !userType || lat == null || lng == null)
      return res.status(400).json({ error: "Dados inválidos para atualizar localização" });

    const fieldLat = userType === "passageiro" ? "passageiro_lat" : "motorista_lat";
    const fieldLng = userType === "passageiro" ? "passageiro_lng" : "motorista_lng";

    const result = await pool.query(`UPDATE corridas SET ${fieldLat}=$1, ${fieldLng}=$2 WHERE id=$3 RETURNING *`, [lat, lng, corrida_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });

    console.log("Localização atualizada:", result.rows[0]);
    return res.json({ message: "Localização atualizada", corrida: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar localização:", err);
    return res.status(500).json({ error: "Erro ao atualizar localização", details: err.message });
  }
};
