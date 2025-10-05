const pool = require("../db");
const { calcularValor } = require("../utils/tarifas");
const axios = require("axios");

const OSRM_BASE_URL = process.env.OSRM_URL || "http://router.project-osrm.org/route/v1/driving";

// ======================
// AUXILIAR: CALCULA ROTA VIA OSRM
// ======================
async function calcularRota(origemCoords, destinoCoords, stops = []) {
  try {
    const coords = [`${origemCoords.longitude},${origemCoords.latitude}`];
    stops.forEach(stop => coords.push(`${stop.longitude},${stop.latitude}`));
    coords.push(`${destinoCoords.longitude},${destinoCoords.latitude}`);

    const url = `${OSRM_BASE_URL}/${coords.join(";")}?overview=full&geometries=geojson&steps=true`;
    const res = await axios.get(url);

    if (res.data.routes && res.data.routes.length > 0) {
      const route = res.data.routes[0];
      return {
        distancia: route.distance, // metros
        duracao: route.duration,   // segundos
        geojson: route.geometry,
        steps: route.legs
      };
    }
    return null;
  } catch (err) {
    console.error("❌ Erro ao calcular rota:", err.message);
    return null;
  }
}

// ======================
// AUXILIAR: EMITIR EVENTO PARA SALA
// ======================
function emitRideUpdate(io, corrida_id, data) {
  io.to(`ride_${corrida_id}`).emit("rideUpdate", data);
}

// ======================
// CRIAR CORRIDA
// ======================
exports.create = async (req, res) => {
  const io = req.app.get("io");
  const {
    passageiro_id, origem, destino, origemCoords, destinoCoords,
    category, stops, passageiroLocation, valor_estimado,
    horario_partida, pagamento
  } = req.body;

  const missingFields = [];
  if (!passageiro_id) missingFields.push("passageiro_id");
  if (!origem) missingFields.push("origem");
  if (!origemCoords?.latitude || !origemCoords?.longitude) missingFields.push("origemCoords");
  if (!destino) missingFields.push("destino");
  if (!destinoCoords?.latitude || !destinoCoords?.longitude) missingFields.push("destinoCoords");
  if (!category) missingFields.push("category");

  if (missingFields.length > 0)
    return res.status(400).json({ error: "Campos obrigatórios ausentes", details: missingFields });

  try {
    const rota = await calcularRota(origemCoords, destinoCoords, stops);
    const distancia_total = rota?.distancia / 1000 || 10; // km
    const duracao_total = rota?.duracao / 60 || 20; // min
    const valor_final = valor_estimado || calcularValor(category, distancia_total, duracao_total, stops?.length || 0, new Date());

    const result = await pool.query(
      `INSERT INTO corridas
       (passageiro_id, origem, destino, origem_lat, origem_lng, destino_lat, destino_lng,
        valor_estimado, category, status, criado_em, paradas, distancia, duracao, passageiro_lat, passageiro_lng,
        rota_geojson, horario_partida, pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'procurando_motorista',NOW(),$10,$11,$12,$13,$14,$15,$16,$17)
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
        rota?.geojson || null,
        horario_partida ? new Date(horario_partida) : new Date(),
        pagamento || "dinheiro"
      ]
    );

    const corrida = result.rows[0];
    corrida.motorista = null;

    emitRideUpdate(io, corrida.id, { status: corrida.status, corrida });
    return res.status(201).json(corrida);
  } catch (err) {
    console.error("❌ Erro ao criar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao criar corrida", details: err.message });
  }
};

// ======================
// MOTORISTA ACEITA CORRIDA
// ======================
exports.accept = async (req, res) => {
  const io = req.app.get("io");
  const { motorista_id, motoristaLocation } = req.body;

  if (!motorista_id || !motoristaLocation?.latitude || !motoristaLocation?.longitude)
    return res.status(400).json({ error: "Dados do motorista inválidos" });

  try {
    const result = await pool.query(
      `UPDATE corridas 
       SET motorista_id=$1, status='motorista_a_caminho', motorista_lat=$2, motorista_lng=$3
       WHERE id=$4 RETURNING *`,
      [motorista_id, motoristaLocation.latitude, motoristaLocation.longitude, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    const motoristaRes = await pool.query(
      `SELECT id, nome, modelo, placa, categoria, lat, lng FROM motoristas WHERE id=$1`,
      [motorista_id]
    );

    corrida.motorista = motoristaRes.rows[0] || null;
    corrida.valor_motorista_estimado = parseFloat((corrida.valor_estimado * 0.8).toFixed(2));

    emitRideUpdate(io, corrida.id, { status: corrida.status, corrida });
    return res.json(corrida);
  } catch (err) {
    console.error("❌ Erro ao aceitar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao aceitar corrida", details: err.message });
  }
};

// ======================
// MOTORISTA CHEGOU
// ======================
exports.driverArrived = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(
      `UPDATE corridas SET status='motorista_chegou', chegou_em=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    emitRideUpdate(io, req.params.id, { status: 'motorista_chegou', corrida: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao atualizar chegada do motorista:", err.message);
    return res.status(500).json({ error: "Erro ao atualizar chegada", details: err.message });
  }
};

// ======================
// INICIAR CORRIDA
// ======================
exports.start = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(
      `UPDATE corridas SET status='corrida_em_andamento', inicio_em=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    emitRideUpdate(io, req.params.id, { status: 'corrida_em_andamento', corrida: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao iniciar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao iniciar corrida", details: err.message });
  }
};

// ======================
// ATUALIZAR LOCALIZAÇÃO
// ======================
exports.updateLocation = async (req, res) => {
  const { corrida_id, userType, lat, lng, motorista_id } = req.body;
  const io = req.app.get("io");

  if (!lat || !lng) return res.status(400).json({ error: "Lat e lng obrigatórios" });

  try {
    let result;
    if (userType === "motorista") {
      if (!motorista_id) return res.status(400).json({ error: "motorista_id obrigatório" });
      result = await pool.query(`UPDATE motoristas SET lat=$1, lng=$2 WHERE id=$3 RETURNING *`, [lat, lng, motorista_id]);
    } else {
      result = await pool.query(`UPDATE corridas SET passageiro_lat=$1, passageiro_lng=$2 WHERE id=$3 RETURNING *`, [lat, lng, corrida_id]);
    }

    if (!result.rows.length) return res.status(404).json({ error: "Registro não encontrado" });

    const corridaRes = await pool.query(`SELECT destino_lat, destino_lng, paradas, status FROM corridas WHERE id=$1`, [corrida_id]);
    const corrida = corridaRes.rows[0];
    const stops = corrida.paradas || [];
    const novaRota = await calcularRota({ latitude: lat, longitude: lng }, { latitude: corrida.destino_lat, longitude: corrida.destino_lng }, stops);

    if (novaRota) {
      await pool.query(`UPDATE corridas SET rota_geojson=$1, distancia=$2, duracao=$3 WHERE id=$4`, [
        novaRota.geojson,
        novaRota.distancia / 1000,
        novaRota.duracao / 60,
        corrida_id
      ]);
    }

    emitRideUpdate(io, corrida_id, {
      userType,
      lat,
      lng,
      status: corrida.status,
      novaRota
    });

    return res.json({ message: "Localização atualizada e rota recalculada", data: result.rows[0] });
  } catch (err) {
    console.error("❌ Erro ao atualizar localização:", err.message);
    return res.status(500).json({ error: "Erro ao atualizar localização", details: err.message });
  }
};

// ======================
// FINALIZAR CORRIDA
// ======================
exports.finish = async (req, res) => {
  const { distancia, duracao, pagamento_confirmado, avaliacao } = req.body;
  const io = req.app.get("io");

  try {
    const result = await pool.query(
      `UPDATE corridas SET status='finalizada', fim_em=NOW(), distancia=$1, duracao=$2, pagamento_confirmado=$3 WHERE id=$4 RETURNING *`,
      [distancia, duracao, pagamento_confirmado ?? true, req.params.id]
    );

    const corrida = result.rows[0];

    if (avaliacao) {
      await pool.query(
        `INSERT INTO avaliacoes (corrida_id, passageiro_id, motorista_id, nota, comentario, criado_em)
         VALUES ($1,$2,$3,$4,$5,NOW())`,
        [corrida.id, corrida.passageiro_id, corrida.motorista_id, avaliacao.nota, avaliacao.comentario || null]
      );
    }

    emitRideUpdate(io, corrida.id, { status: 'finalizada', corrida });
    return res.json(corrida);
  } catch (err) {
    console.error("❌ Erro ao finalizar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao finalizar corrida", details: err.message });
  }
};

// ======================
// CANCELAR CORRIDA
// ======================
exports.cancel = async (req, res) => {
  const io = req.app.get("io");

  try {
    const result = await pool.query(
      `UPDATE corridas SET status='cancelada', fim_em=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    emitRideUpdate(io, req.params.id, { status: 'cancelada', corrida: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao cancelar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao cancelar corrida", details: err.message });
  }
};

// ======================
// BUSCAR CORRIDA ATUAL DO PASSAGEIRO
// ======================
exports.getCurrentRideByPassenger = async (req, res) => {
  try {
    const { passageiro_id } = req.params;
    const result = await pool.query(
      `SELECT c.*, m.id as motorista_id, m.nome as motorista_nome, m.modelo as motorista_modelo, m.placa as motorista_placa, m.lat as motorista_lat, m.lng as motorista_lng
       FROM corridas c
       LEFT JOIN motoristas m ON c.motorista_id=m.id
       WHERE c.passageiro_id=$1 AND c.status NOT IN ('finalizada','cancelada')
       ORDER BY c.criado_em DESC LIMIT 1`,
      [passageiro_id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Nenhuma corrida encontrada" });

    const ride = result.rows[0];
    ride.motorista = ride.motorista_id ? {
      id: ride.motorista_id,
      nome: ride.motorista_nome,
      modelo: ride.motorista_modelo,
      placa: ride.motorista_placa,
      lat: ride.motorista_lat,
      lng: ride.motorista_lng,
    } : null;

    return res.json(ride);
  } catch (err) {
    console.error("❌ Erro ao buscar corrida passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar corrida", details: err.message });
  }
};

// ======================
// BUSCAR CORRIDA ATUAL DO MOTORISTA
// ======================
exports.getCurrentRideByDriver = async (req, res) => {
  try {
    const { motorista_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM corridas WHERE motorista_id=$1 AND status NOT IN ('finalizada','cancelada') ORDER BY criado_em DESC LIMIT 1`,
      [motorista_id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Nenhuma corrida encontrada" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar corrida motorista:", err.message);
    return res.status(500).json({ error: "Erro ao buscar corrida", details: err.message });
  }
};

// ======================
// MOTORISTAS ONLINE PRÓXIMOS
// ======================
exports.getOnlineDriversNearby = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat e lng obrigatórios" });

    const result = await pool.query(
      `SELECT id, nome, modelo, placa, lat AS latitude, lng AS longitude FROM motoristas WHERE online=true`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao buscar motoristas:", err.message);
    return res.status(500).json({ error: "Erro ao buscar motoristas", details: err.message });
  }
};
