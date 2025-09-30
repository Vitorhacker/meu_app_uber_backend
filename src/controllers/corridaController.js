// src/controllers/corridaController.js
const pool = require("../db");

// Criar corrida
exports.create = async (req, res) => {
  const { passageiro_id, origem, destino, preco } = req.body;

  if (!passageiro_id || !origem || !destino || !preco) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  try {
    const q = `
      INSERT INTO corridas (passageiro_id, origem, destino, preco, status, created_at) 
      VALUES ($1,$2,$3,$4,$5,NOW()) 
      RETURNING *`;
    const r = await pool.query(q, [passageiro_id, origem, destino, preco, "pendente"]);
    res.status(201).json({ message: "Corrida criada", data: r.rows[0] });
  } catch (err) {
    console.error("❌ Erro create corrida:", err);
    res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// Listar todas corridas
exports.list = async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM corridas ORDER BY created_at DESC");
    res.json({ total: r.rowCount, data: r.rows });
  } catch (err) {
    console.error("❌ Erro list corridas:", err);
    res.status(500).json({ error: "Erro ao listar corridas" });
  }
};

// Buscar corrida por ID
exports.get = async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query("SELECT * FROM corridas WHERE id = $1", [id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }
    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Erro get corrida:", err);
    res.status(500).json({ error: "Erro ao buscar corrida" });
  }
};

// Atribuir motorista
exports.assignDriver = async (req, res) => {
  const { id } = req.params;
  const { motorista_id } = req.body;

  if (!motorista_id) return res.status(400).json({ error: "Motorista obrigatório." });

  try {
    const q = `
      UPDATE corridas 
      SET motorista_id=$1, status=$2, updated_at=NOW() 
      WHERE id=$3 
      RETURNING *`;
    const r = await pool.query(q, [motorista_id, "em_andamento", id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    res.json({ message: "Motorista atribuído", data: r.rows[0] });
  } catch (err) {
    console.error("❌ Erro assignDriver:", err);
    res.status(500).json({ error: "Erro ao atribuir motorista" });
  }
};

// Finalizar corrida
exports.finish = async (req, res) => {
  const { id } = req.params;

  try {
    const q = `
      UPDATE corridas 
      SET status=$1, finalizada_em=NOW() 
      WHERE id=$2 
      RETURNING *`;
    const r = await pool.query(q, ["concluida", id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    res.json({ message: "Corrida concluída", data: r.rows[0] });
  } catch (err) {
    console.error("❌ Erro finish corrida:", err);
    res.status(500).json({ error: "Erro ao finalizar corrida" });
  }
};
