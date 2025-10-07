const pool = require("../db");

// ==========================
// Criar passageiro vinculado a usuário existente
// ==========================
exports.registerPassenger = async (req, res) => {
  try {
    console.log("🚀 Criando passageiro para usuário existente:", req.body);
    const { user_id, nome, telefone } = req.body;

    if (!user_id || !nome || !telefone) {
      return res.status(400).json({ error: "Campos obrigatórios: user_id, nome, telefone" });
    }

    // Checa duplicidade de passageiro
    const existing = await pool.query("SELECT * FROM passageiros WHERE user_id=$1", [user_id]);
    if (existing.rows.length) {
      return res.status(400).json({ error: "Passageiro já existe para esse usuário" });
    }

    const result = await pool.query(
      `INSERT INTO passageiros (user_id, nome, telefone)
       VALUES ($1,$2,$3) RETURNING *`,
      [user_id, nome, telefone]
    );

    console.log("✅ Passageiro criado:", result.rows[0]);
    return res.status(201).json({ passageiro: result.rows[0] });

  } catch (err) {
    console.error("❌ Erro ao criar passageiro:", err);
    return res.status(500).json({ error: "Erro ao criar passageiro" });
  }
};

// Login passageiro (opcional, mas pode reutilizar authController)
exports.loginPassenger = async (req, res) => {
  res.status(501).json({ error: "Login deve ser feito via /auth/login" });
};
