// src/controllers/corridaController.js
const pool = require("../db");

// ========================
// Criar corrida
// ========================
exports.create = async (req, res) => {
  try {
    const {
      passageiro_id,
      origem,
      destino,
      distancia,
      duracao,
      valor_estimado,
      categoria,
      horario
    } = req.body;

    if (!passageiro_id || !origem || !destino || !valor_estimado) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const result = await pool.query(
      `
      INSERT INTO corridas 
      (passageiro_id, origem, destino, distancia, duracao, valor_estimado, categoria, horario, status, criado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendente',NOW())
      RETURNING *;
      `,
      [
        passageiro_id,
        origem,
        destino,
        distancia || null,
        duracao || null,
        valor_estimado,
        categoria || "comum",
        horario || new Date()
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao criar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// ========================
// Listar todas corridas
// ========================
exports.listAll = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM corridas ORDER BY criado_em DESC"
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao listar corridas:", err.message);
    return res.status(500).json({ error: "Erro ao listar corridas" });
  }
};

// ========================
// Buscar corrida por ID
// ========================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM corridas WHERE id=$1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao buscar corrida" });
  }
};

// ========================
// Atualizar corrida
// ========================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      motorista_id,
      status,
      valor_final,
      categoria,
      horario
    } = req.body;

    const result = await pool.query(
      `
      UPDATE corridas
      SET motorista_id = COALESCE($1, motorista_id),
          status = COALESCE($2, status),
          valor_final = COALESCE($3, valor_final),
          categoria = COALESCE($4, categoria),
          horario = COALESCE($5, horario),
          atualizado_em = NOW()
      WHERE id=$6
      RETURNING *;
      `,
      [motorista_id || null, status || null, valor_final || null, categoria || null, horario || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao atualizar corrida:", err.message);
    return res.status(500).json({ error: "Erro ao atualizar corrida" });
  }
};

// ========================
// Remover corrida
// ========================
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM corridas WHERE id=$1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    return res.json({ message: "Corrida removida com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao remover corrida:", err.message);
    return res.status(500).json({ error: "Erro ao remover corrida" });
  }
};
