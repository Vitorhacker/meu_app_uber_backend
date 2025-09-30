// src/controllers/corridaController.js
const pool = require("../db");

// Criar corrida
exports.create = async (req, res) => {
  const { passageiro_id, origem, destino, preco, categoria } = req.body;

  if (!passageiro_id || !origem || !destino || !preco || !categoria) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  try {
    const q = `
      INSERT INTO corridas (passageiro_id, origem, destino, preco, categoria, status, created_at) 
      VALUES ($1,$2,$3,$4,$5,$6,NOW()) 
      RETURNING *`;
    const r = await pool.query(q, [
      passageiro_id,
      origem,
      destino,
      preco,
      categoria,
      "busca" // status inicial
    ]);

    const corrida = r.rows[0];

    res.status(201).json({
      data: corrida,
      motorista: null
    });
  } catch (err) {
    console.error("❌ Erro create corrida:", err);
    res.status(500).json({ error: "Erro ao criar corrida" });
  }
};

// Listar todas corridas
exports.list = async (req, res) => {
  try {
    const q = `
      SELECT c.*, 
             m.id as motorista_id, m.nome as motorista_nome, m.email as motorista_email,
             m.cpf as motorista_cpf, m.telefone as motorista_telefone
      FROM corridas c
      LEFT JOIN motoristas m ON c.motorista_id = m.id
      ORDER BY c.created_at DESC
    `;
    const r = await pool.query(q);

    const data = r.rows.map(row => ({
      ...row,
      motorista: row.motorista_id
        ? {
            id: row.motorista_id,
            nome: row.motorista_nome,
            email: row.motorista_email,
            cpf: row.motorista_cpf,
            telefone: row.motorista_telefone
          }
        : null
    }));

    res.json({ total: data.length, data });
  } catch (err) {
    console.error("❌ Erro list corridas:", err);
    res.status(500).json({ error: "Erro ao listar corridas" });
  }
};

// Buscar corrida por ID
exports.get = async (req, res) => {
  const { id } = req.params;
  try {
    const q = `
      SELECT c.*, 
             m.id as motorista_id, m.nome as motorista_nome, m.email as motorista_email,
             m.cpf as motorista_cpf, m.telefone as motorista_telefone
      FROM corridas c
      LEFT JOIN motoristas m ON c.motorista_id = m.id
      WHERE c.id = $1
    `;
    const r = await pool.query(q, [id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    const row = r.rows[0];
    const corrida = {
      ...row,
      motorista: row.motorista_id
        ? {
            id: row.motorista_id,
            nome: row.motorista_nome,
            email: row.motorista_email,
            cpf: row.motorista_cpf,
            telefone: row.motorista_telefone
          }
        : null
    };

    res.json({ data: corrida });
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
    const r = await pool.query(q, [motorista_id, "aceita", id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    const corrida = r.rows[0];

    // busca dados do motorista
    const m = await pool.query(
      "SELECT id, nome, email, cpf, telefone FROM motoristas WHERE id=$1",
      [motorista_id]
    );

    res.json({
      data: corrida,
      motorista: m.rows.length ? m.rows[0] : null
    });
  } catch (err) {
    console.error("❌ Erro assignDriver:", err);
    res.status(500).json({ error: "Erro ao atribuir motorista" });
  }
};

// Iniciar corrida
exports.start = async (req, res) => {
  const { id } = req.params;

  try {
    const q = `
      UPDATE corridas 
      SET status=$1, iniciou_em=NOW(), updated_at=NOW() 
      WHERE id=$2 
      RETURNING *`;
    const r = await pool.query(q, ["em_andamento", id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    res.json({ data: r.rows[0], motorista: null });
  } catch (err) {
    console.error("❌ Erro start corrida:", err);
    res.status(500).json({ error: "Erro ao iniciar corrida" });
  }
};

// Finalizar corrida
exports.finish = async (req, res) => {
  const { id } = req.params;

  try {
    const q = `
      UPDATE corridas 
      SET status=$1, finalizada_em=NOW(), updated_at=NOW() 
      WHERE id=$2 
      RETURNING *`;
    const r = await pool.query(q, ["finalizada", id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Corrida não encontrada" });
    }

    res.json({ data: r.rows[0], motorista: null });
  } catch (err) {
    console.error("❌ Erro finish corrida:", err);
    res.status(500).json({ error: "Erro ao finalizar corrida" });
  }
};
