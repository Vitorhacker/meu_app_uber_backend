const pool = require("../db");
const { calcularValor } = require("../utils/tarifas");
const axios = require("axios");

const OSRM_BASE_URL = process.env.OSRM_URL || "http://router.project-osrm.org/route/v1/driving";

// ======================================================
// 🔧 FUNÇÃO AUXILIAR: CALCULAR ROTA VIA OSRM
// ======================================================
async function calcularRota(origemCoords, destinoCoords, stops = []) {
  try {
    const coords = [`${origemCoords.longitude},${origemCoords.latitude}`];
    stops.forEach(stop => coords.push(`${stop.longitude},${stop.latitude}`));
    coords.push(`${destinoCoords.longitude},${destinoCoords.latitude}`);

    const url = `${OSRM_BASE_URL}/${coords.join(";")}?overview=full&geometries=geojson&steps=true`;
    const res = await axios.get(url);

    if (res.data.routes?.length) {
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

// ======================================================
// 🔧 FUNÇÃO AUXILIAR: EMITIR EVENTO VIA SOCKET
// ======================================================
function emitCorridaUpdate(io, corrida_id, data) {
  io.to(`corrida_${corrida_id}`).emit("corridaUpdate", data);
}

// ======================================================
// 🚗 CRIAR CORRIDA
// ======================================================
exports.create = async (req, res) => {
  const io = req.app.get("io");

  // ⚠️ passageiro_id vem do token (req.user) fornecido pelo middleware verifyToken
  const passageiro_id = req.user?.id;

  if (!passageiro_id)
    return res.status(401).json({ error: "Passageiro não autenticado" });

  const {
    origem,
    destino,
    origemCoords,
    destinoCoords,
    category,
    stops,
    valor_estimado,
    horario_partida,
    pagamento
  } = req.body;

  const missing = [];
  if (!origem) missing.push("origem");
  if (!origemCoords?.latitude || !origemCoords?.longitude) missing.push("origemCoords");
  if (!destino) missing.push("destino");
  if (!destinoCoords?.latitude || !destinoCoords?.longitude) missing.push("destinoCoords");
  if (!category) missing.push("category");

  if (missing.length)
    return res.status(400).json({ error: "Campos obrigatórios ausentes", details: missing });

  try {
    const rota = await calcularRota(origemCoords, destinoCoords, stops);
    const distancia_km = rota?.distancia / 1000 || 10;
    const duracao_min = rota?.duracao / 60 || 20;
    const valor_final = valor_estimado || calcularValor(category, distancia_km, duracao_min, stops?.length || 0, new Date());

    const result = await pool.query(
      `INSERT INTO corridas
        (passageiro_id, origem, destino, origem_lat, origem_lng,
         destino_lat, destino_lng, category, status, criado_em,
         paradas, distancia, duracao, valor_estimado, rota_geojson,
         horario_partida, pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'criada',NOW(),
               $9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        passageiro_id,
        origem,
        destino,
        origemCoords.latitude,
        origemCoords.longitude,
        destinoCoords.latitude,
        destinoCoords.longitude,
        category,
        JSON.stringify(stops || []),
        distancia_km,
        duracao_min,
        valor_final,
        rota?.geojson || null,
        horario_partida ? new Date(horario_partida) : new Date(),
        pagamento || "dinheiro"
      ]
    );

    const corrida = result.rows[0];
    return res.status(201).json({
      message: "Corrida criada com sucesso",
      corrida_id: corrida.id,
      corrida
    });
  } catch (err) {
    console.error("❌ Erro ao criar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao criar corrida", details: err.message });
  }
};

// ======================================================
// 🧭 BUSCAR CORRIDA PELO ID
// ======================================================
exports.getById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM corridas WHERE id=$1`, [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ error: "Corrida não encontrada" });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar corrida por ID:", err.message);
    return res.status(500).json({ error: "Erro ao buscar corrida", details: err.message });
  }
};

// ======================================================
// 🚕 INICIAR BUSCA DE MOTORISTA
// ======================================================
exports.findDriver = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(
      `UPDATE corridas SET status='procurando_motorista' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Corrida não encontrada" });

    const corrida = result.rows[0];
    emitCorridaUpdate(io, corrida.id, { status: corrida.status, message: "Procurando motorista..." });

    return res.json({ message: "Busca por motorista iniciada", corrida });
  } catch (err) {
    console.error("❌ Erro ao iniciar busca de motorista:", err.message);
    return res.status(500).json({ error: "Erro ao iniciar busca", details: err.message });
  }
};

// ======================================================
// 🚗 MOTORISTA ACEITA CORRIDA
// ======================================================
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
    emitCorridaUpdate(io, corrida.id, { status: corrida.status, corrida });
    return res.json(corrida);
  } catch (err) {
    console.error("❌ Erro ao aceitar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao aceitar corrida", details: err.message });
  }
};

// ======================================================
// 🚦 MOTORISTA CHEGOU
// ======================================================
exports.driverArrived = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(
      `UPDATE corridas SET status='motorista_chegou', chegou_em=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });
    emitCorridaUpdate(io, req.params.id, { status: 'motorista_chegou', corrida: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao atualizar chegada:", err.message);
    return res.status(500).json({ error: "Erro ao atualizar chegada", details: err.message });
  }
};

// ======================================================
// 🚘 INICIAR CORRIDA
// ======================================================
exports.start = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(
      `UPDATE corridas SET status='em_andamento', inicio_em=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });
    emitCorridaUpdate(io, req.params.id, { status: 'em_andamento', corrida: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao iniciar corrida:", err.message);
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

    emitCorridaUpdate(io, corrida.id, { status: 'finalizada', corrida });
    return res.json(corrida);
  } catch (err) {
    console.error("❌ Erro ao finalizar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao finalizar corrida", details: err.message });
  }
};

// ======================================================
// ❌ CANCELAR CORRIDA
// ======================================================
exports.cancel = async (req, res) => {
  const io = req.app.get("io");
  try {
    const result = await pool.query(
      `UPDATE corridas SET status='cancelada', fim_em=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Corrida não encontrada" });
    emitCorridaUpdate(io, req.params.id, { status: 'cancelada', corrida: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao cancelar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao cancelar corrida", details: err.message });
  }
};
