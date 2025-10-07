// controllers/authController.js
const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ======================================================
// 🟢 REGISTRAR PASSAGEIRO
// ======================================================
exports.register = async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;
    console.log("🚀 Registrando passageiro:", { nome, email, cpf, telefone });

    // Verificar se já existe usuário com email ou cpf
    const existing = await pool.query(
      "SELECT * FROM passageiros WHERE email=$1 OR cpf=$2",
      [email, cpf]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: "Usuário já existe" });
    }

    // Inserir passageiro no banco
    const result = await pool.query(
      `INSERT INTO passageiros (nome, email, senha, cpf, telefone, criado_em)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [nome, email, senha, cpf, telefone]
    );

    const user = result.rows[0];
    if (!user) return res.status(500).json({ error: "Erro ao registrar usuário" });

    // Criar token JWT automaticamente
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("✅ Passageiro registrado com sucesso:", user.id);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error("❌ Erro no registro:", err.message);
    return res.status(500).json({ error: "Erro ao registrar usuário", details: err.message });
  }
};

// ======================================================
// 🟢 LOGIN DE PASSAGEIRO
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log("🚀 Tentando login:", email);

    const result = await pool.query("SELECT * FROM passageiros WHERE email=$1 AND senha=$2", [email, senha]);
    if (!result.rows.length) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET, { expiresIn: "7d" });

    console.log("✅ Login realizado:", user.id);
    return res.json({ user, token });
  } catch (err) {
    console.error("❌ Erro no login:", err.message);
    return res.status(500).json({ error: "Erro ao realizar login", details: err.message });
  }
};

// ======================================================
// 🟢 OBTER PERFIL DO USUÁRIO PELO TOKEN
// ======================================================
exports.profile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Token ausente" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query("SELECT * FROM passageiros WHERE id=$1", [decoded.userId]);
    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err.message);
    return res.status(500).json({ error: "Erro ao buscar perfil", details: err.message });
  }
};
