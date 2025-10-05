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
// BUSCAR MOTORISTAS ONLINE PRÓXIMOS
// ======================
exports.getOnlineDriversNearby = async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat e lng obrigatórios" });

  const radiusKm = parseFloat(radius) || 5;
  try {
    // Tenta usar earth_distance
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
