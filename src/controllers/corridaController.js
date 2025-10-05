const pool = require("../db");
const { calcularValor } = require("../utils/tarifas");
const axios = require("axios");

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
    valor_estimado,
  } = req.body;

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

    // Traçar rota usando OSRM
    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${origemCoords.longitude},${origemCoords.latitude};${destinoCoords.longitude},${destinoCoords.latitude}?overview=full&geometries=geojson`;
      const osrmRes = await axios.get(osrmUrl);
      if (osrmRes.data.routes && osrmRes.data.routes.length > 0) {
        corrida.route = osrmRes.data.routes[0].geometry;
      }
    } catch (err) {
      console.warn("Erro ao obter rota OSRM:", err.message);
      corrida.route = null;
    }

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
    const motoristaRes = await pool.query(`SELECT id, nome, modelo, placa, categoria, lat, lng FROM motoristas WHERE id = $1`, [motorista_id]);
    corrida.motorista = motoristaRes.rows[0] || null;
    corrida.valor_motorista_estimado = parseFloat((corrida.valor_estimado * 0.8).toFixed(2));

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
  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'corrida_em_andamento', inicio_em = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { distancia, duracao } = req.body;
    const corrida_id = req.params.id;

    const corridaRes = await client.query(`SELECT * FROM corridas WHERE id = $1`, [corrida_id]);
    if (corridaRes.rows.length === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Corrida não encontrada" }); }

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
  try {
    const result = await pool.query(
      `UPDATE corridas SET status = 'cancelada', fim_em = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Corrida não encontrada" });
    return res.json({ message: "Corrida cancelada com sucesso", corrida: result.rows[0] });
  } catch (err) {
    console.error("Erro ao cancelar corrida:", err);
    return res.status(500).json({ error: "Erro ao cancelar corrida", details: err.message });
  }
};

// ======================
// BUSCAR CORRIDA ATUAL DO PASSAGEIRO
// ======================
exports.getCurrentRideByPassenger = async (req, res) => {
  const { passageiro_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.*, m.id as motorista_id, m.nome as motorista_nome, m.modelo as motorista_modelo, m.placa as motorista_placa, m.lat as motorista_lat, m.lng as motorista_lng
       FROM corridas c
       LEFT JOIN motoristas m ON c.motorista_id = m.id
       WHERE c.passageiro_id = $1 AND c.status NOT IN ('finalizada','cancelada')
       ORDER BY c.criado_em DESC
       LIMIT 1`,
      [passageiro_id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Nenhuma corrida encontrada" });

    const ride = result.rows[0];
    ride.motorista = ride.motorista_id
      ? {
          id: ride.motorista_id,
          nome: ride.motorista_nome,
          modelo: ride.motorista_modelo,
          placa: ride.motorista_placa,
          lat: ride.motorista_lat,
          lng: ride.motorista_lng,
        }
      : null;

    return res.json(ride);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar corrida", details: err.message });
  }
};

// ======================
// BUSCAR MOTORISTAS ONLINE PRÓXIMOS
// ======================
exports.getOnlineDriversNearby = async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat e lng obrigatórios" });

  const radiusKm = parseFloat(radius) || 5;
  try {
    try {
      const result = await pool.query(
        `SELECT id, nome, modelo, placa, lat AS latitude, lng AS longitude,
                earth_distance(ll_to_earth($1, $2), ll_to_earth(lat, lng)) AS distancia_m
         FROM motoristas
         WHERE online = true
           AND earth_distance(ll_to_earth($1, $2), ll_to_earth(lat, lng)) <= $3 * 1000
         ORDER BY distancia_m ASC`,
        [lat, lng, radiusKm]
      );
      return res.json(result.rows);
    } catch (geoErr) {
      console.warn("⚠️ Extensões geográficas indisponíveis, usando fallback simples.");
      const result = await pool.query(
        `SELECT id, nome, modelo, placa, lat AS latitude, lng AS longitude FROM motoristas WHERE online = true`
      );
      return res.json(result.rows);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar motoristas", details: err.message });
  }
};

// ======================
// ATUALIZAR LOCALIZAÇÃO EM TEMPO REAL
// ======================
exports.updateLocation = async (req, res) => {
  const { corrida_id, userType, lat, lng, motorista_id } = req.body;

  if (userType === "motorista" && !motorista_id) return res.status(400).json({ error: "motorista_id obrigatório para motorista" });

  const fieldLat = userType === "passageiro" ? "passageiro_lat" : "motorista_lat";
  const fieldLng = userType === "passageiro" ? "passageiro_lng" : "motorista_lng";

  try {
    let result;
    if (userType === "motorista") {
      result = await pool.query(`UPDATE motoristas SET lat=$1, lng=$2 WHERE id=$3 RETURNING *`, [lat, lng, motorista_id]);
    } else {
      result = await pool.query(`UPDATE corridas SET ${fieldLat}=$1, ${fieldLng}=$2 WHERE id=$3 RETURNING *`, [lat, lng, corrida_id]);
    }

    if (!result.rows.length) return res.status(404).json({ error: "Registro não encontrado" });
    return res.json({ message: "Localização atualizada", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar localização", details: err.message });
  }
};
