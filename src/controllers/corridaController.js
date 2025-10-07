const pool = require("../db");
const { calcularValor } = require("../utils/tarifas");
const axios = require("axios");

const OSRM_BASE_URL = process.env.OSRM_URL || "http://router.project-osrm.org/route/v1/driving";

// 🔹 Calcula rota via OSRM
async function calcularRota(origemCoords, destinoCoords, stops = []) {
  try {
    const coords = [`${origemCoords.longitude},${origemCoords.latitude}`];
    stops.forEach(stop => {
      if (stop.latitude != null && stop.longitude != null) {
        coords.push(`${stop.longitude},${stop.latitude}`);
      }
    });
    coords.push(`${destinoCoords.longitude},${destinoCoords.latitude}`);

    const url = `${OSRM_BASE_URL}/${coords.join(";")}?overview=full&geometries=geojson&steps=true`;
    const res = await axios.get(url);

    if (res.data.routes?.length) {
      const route = res.data.routes[0];
      return { distancia: route.distance, duracao: route.duration, geojson: route.geometry, steps: route.legs };
    }
    return null;
  } catch (err) {
    console.error("❌ Erro ao calcular rota:", err.message);
    throw new Error("Falha ao calcular rota");
  }
}

// 🔹 Emitir evento via socket
function emitCorridaUpdate(io, corrida_id, data) {
  try {
    io.to(`corrida_${corrida_id}`).emit("corridaUpdate", data);
  } catch (err) {
    console.error("❌ Erro ao emitir evento via socket:", err.message);
  }
}

// ======================================================
// 🟢 CRIAR CORRIDA
// ======================================================
exports.create = async (req, res) => {
  const io = req.app.get("io");
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: "Usuário não autenticado" });

    const passageiroResult = await pool.query("SELECT * FROM passageiros WHERE id=$1", [user.id]);
    if (!passageiroResult.rows.length) return res.status(400).json({ error: "Passageiro não encontrado" });
    const passageiro = passageiroResult.rows[0];

    let { origem, destino, origemCoords, destinoCoords, category, stops, horario_partida, pagamento } = req.body;

    const origemCoordsFix = { latitude: origemCoords?.latitude ?? origemCoords?.lat, longitude: origemCoords?.longitude ?? origemCoords?.lng };
    const destinoCoordsFix = { latitude: destinoCoords?.latitude ?? destinoCoords?.lat, longitude: destinoCoords?.longitude ?? destinoCoords?.lng };

    const missing = [];
    if (!origem) missing.push("origem");
    if (!origemCoordsFix.latitude || !origemCoordsFix.longitude) missing.push("origemCoords");
    if (!destino) missing.push("destino");
    if (!destinoCoordsFix.latitude || !destinoCoordsFix.longitude) missing.push("destinoCoords");
    if (!category) missing.push("category");
    if (missing.length) return res.status(400).json({ error: "Campos obrigatórios ausentes", details: missing });

    stops = Array.isArray(stops) ? stops.filter(s => s.latitude != null && s.longitude != null) : [];

    let horarioPartidaDate = new Date();
    if (horario_partida) {
      const parsed = new Date(horario_partida);
      if (!isNaN(parsed)) horarioPartidaDate = parsed;
    }

    const rota = await calcularRota(origemCoordsFix, destinoCoordsFix, stops);
    const distancia_km = rota?.distancia / 1000 || 10;
    const duracao_min = rota?.duracao / 60 || 20;

    // 🔹 calcular todos os valores
    const valor_hatch = calcularValor('hatch', distancia_km, duracao_min, stops.length, new Date());
    const valor_plus = calcularValor('sedan', distancia_km, duracao_min, stops.length, new Date());
    const valor_premium = calcularValor('suv', distancia_km, duracao_min, stops.length, new Date());

    const result = await pool.query(
      `INSERT INTO corridas
        (passageiro_id, origem, destino, origem_lat, origem_lng,
         destino_lat, destino_lng, category, status, criado_em,
         paradas, distancia, duracao, valor_estimado, valor_hatch, valor_plus, valor_premium, rota_geojson,
         horario_partida, pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'criada',NOW(),
               $9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        passageiro.id,
        origem, destino,
        origemCoordsFix.latitude, origemCoordsFix.longitude,
        destinoCoordsFix.latitude, destinoCoordsFix.longitude,
        category,
        JSON.stringify(stops),
        distancia_km, duracao_min,
        valor_hatch, // valor_estimado default será o hatch
        valor_hatch,
        valor_plus,
        valor_premium,
        rota?.geojson || null,
        horarioPartidaDate,
        pagamento || "dinheiro"
      ]
    );

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: 'criada', corrida, message: "Corrida criada" });

    return res.status(201).json({ message: "Corrida criada", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][CREATE] Erro ao criar corrida:", err);
    return res.status(500).json({ error: "Erro ao criar corrida", details: err.message });
  }
};

// ======================================================
// 🧭 BUSCAR CORRIDA PELO ID
// ======================================================
exports.getById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM corridas WHERE id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });
    return res.json({ message: "Corrida encontrada", corrida: result.rows[0] });
  } catch (err) {
    console.error("❌ [CorridaController][GET] Erro ao buscar corrida:", err);
    return res.status(500).json({ error: "Erro ao buscar corrida", details: err.message });
  }
};

// ======================================================
// 🚕 INICIAR BUSCA DE MOTORISTA
// ======================================================
exports.findDriver = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(`UPDATE corridas SET status='procurando_motorista' WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: corrida.status, corrida, message: "Procurando motorista" });
    return res.json({ message: "Busca por motorista iniciada", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][FIND DRIVER] Erro:", err);
    return res.status(500).json({ error: "Erro ao iniciar busca", details: err.message });
  }
};

// ======================================================
// 🚗 MOTORISTA ACEITA CORRIDA
// ======================================================
exports.accept = async (req, res) => {
  const io = req.app.get("io");
  const { motorista_id, motoristaLocation } = req.body;
  try {
    if (!motorista_id || !motoristaLocation?.latitude || !motoristaLocation?.longitude)
      return res.status(400).json({ error: "Dados do motorista inválidos" });

    const result = await pool.query(
      `UPDATE corridas SET motorista_id=$1, status='motorista_a_caminho', motorista_lat=$2, motorista_lng=$3
       WHERE id=$4 RETURNING *`,
      [motorista_id, motoristaLocation.latitude, motoristaLocation.longitude, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: corrida.status, corrida, message: "Motorista a caminho" });
    return res.json({ message: "Corrida aceita pelo motorista", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][ACCEPT] Erro:", err);
    return res.status(500).json({ error: "Erro ao aceitar corrida", details: err.message });
  }
};

// ======================================================
// 🚦 MOTORISTA CHEGOU
// ======================================================
exports.driverArrived = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(`UPDATE corridas SET status='motorista_chegou', chegou_em=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: 'motorista_chegou', corrida, message: "Motorista chegou" });
    return res.json({ message: "Motorista chegou", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][ARRIVED] Erro:", err);
    return res.status(500).json({ error: "Erro ao atualizar chegada", details: err.message });
  }
};

// ======================================================
// 🚦 INICIAR CORRIDA
// ======================================================
exports.start = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(`UPDATE corridas SET status='em_andamento', inicio_em=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: 'em_andamento', corrida, message: "Corrida em andamento" });
    return res.json({ message: "Corrida iniciada", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][START] Erro:", err);
    return res.status(500).json({ error: "Erro ao iniciar corrida", details: err.message });
  }
};

// ======================================================
// 🏁 FINALIZAR CORRIDA
// ======================================================
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

    emitCorridaUpdate(io, corrida.id, { status: 'finalizada', corrida, message: "Corrida finalizada" });
    return res.json({ message: "Corrida finalizada", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][FINISH] Erro:", err);
    return res.status(500).json({ error: "Erro ao finalizar corrida", details: err.message });
  }
};

// ======================================================
// ❌ CANCELAR CORRIDA
// ======================================================
exports.cancel = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(`UPDATE corridas SET status='cancelada', fim_em=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: 'cancelada', corrida, message: "Corrida cancelada" });
    return res.json({ message: "Corrida cancelada", corrida });
  } catch (err) {
    console.error("❌ [CorridaController][CANCEL] Erro:", err);
    return res.status(500).json({ error: "Erro ao cancelar corrida", details: err.message });
  }
};

// ======================================================
// 🟢 GERENCIAR PARADAS (ADD / UPDATE) com valores por categoria
// ======================================================
exports.addParada = async (req, res) => {
  const io = req.app.get("io");
  try {
    const { lat, lng, nome } = req.body;
    if (!lat || !lng || !nome) return res.status(400).json({ error: "Parâmetros inválidos" });

    const corridaResult = await pool.query("SELECT * FROM corridas WHERE id=$1", [req.params.id]);
    if (!corridaResult.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = corridaResult.rows[0];
    const paradas = corrida.paradas ? [...corrida.paradas, { lat, lng, nome }] : [{ lat, lng, nome }];

    const origemCoordsFix = { latitude: corrida.origem_lat, longitude: corrida.origem_lng };
    const destinoCoordsFix = { latitude: corrida.destino_lat, longitude: corrida.destino_lng };
    const rota = await calcularRota(origemCoordsFix, destinoCoordsFix, paradas);
    const distancia_km = rota?.distancia / 1000 || 10;
    const duracao_min = rota?.duracao / 60 || 20;

    // 🔹 recalcular todos os valores
    const valor_hatch = calcularValor('hatch', distancia_km, duracao_min, paradas.length, new Date());
    const valor_plus = calcularValor('sedan', distancia_km, duracao_min, paradas.length, new Date());
    const valor_premium = calcularValor('suv', distancia_km, duracao_min, paradas.length, new Date());

    const updated = await pool.query(
      `UPDATE corridas SET paradas=$1, distancia=$2, duracao=$3, valor_estimado=$4,
       valor_hatch=$5, valor_plus=$6, valor_premium=$7, rota_geojson=$8 WHERE id=$9 RETURNING *`,
      [paradas, distancia_km, duracao_min, valor_hatch, valor_hatch, valor_plus, valor_premium, rota?.geojson || null, req.params.id]
    );

    const corridaAtualizada = updated.rows[0];
    emitCorridaUpdate(io, req.params.id, { corrida: corridaAtualizada, status: corridaAtualizada.status, message: "Parada adicionada" });
    res.json({ message: "Parada adicionada", corrida: corridaAtualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao adicionar parada", details: err.message });
  }
};

exports.updateParadas = async (req, res) => {
  const io = req.app.get("io");
  try {
    const { paradas } = req.body;
    if (!Array.isArray(paradas)) return res.status(400).json({ error: "Paradas inválidas" });

    const corridaResult = await pool.query("SELECT * FROM corridas WHERE id=$1", [req.params.id]);
    if (!corridaResult.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = corridaResult.rows[0];

    const origemCoordsFix = { latitude: corrida.origem_lat, longitude: corrida.origem_lng };
    const destinoCoordsFix = { latitude: corrida.destino_lat, longitude: corrida.destino_lng };
    const rota = await calcularRota(origemCoordsFix, destinoCoordsFix, paradas);
    const distancia_km = rota?.distancia / 1000 || 10;
    const duracao_min = rota?.duracao / 60 || 20;

    // 🔹 recalcular todos os valores
    const valor_hatch = calcularValor('hatch', distancia_km, duracao_min, paradas.length, new Date());
    const valor_plus = calcularValor('sedan', distancia_km, duracao_min, paradas.length, new Date());
    const valor_premium = calcularValor('suv', distancia_km, duracao_min, paradas.length, new Date());

    const updated = await pool.query(
      `UPDATE corridas SET paradas=$1, distancia=$2, duracao=$3, valor_estimado=$4,
       valor_hatch=$5, valor_plus=$6, valor_premium=$7, rota_geojson=$8 WHERE id=$9 RETURNING *`,
      [paradas, distancia_km, duracao_min, valor_hatch, valor_hatch, valor_plus, valor_premium, rota?.geojson || null, req.params.id]
    );

    const corridaAtualizada = updated.rows[0];
    emitCorridaUpdate(io, req.params.id, { corrida: corridaAtualizada, status: corridaAtualizada.status, message: "Paradas atualizadas" });
    res.json({ message: "Paradas atualizadas", corrida: corridaAtualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar paradas", details: err.message });
  }
};

// Exportar pool para rotas externas
exports.pool = pool;
