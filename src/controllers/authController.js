// src/controllers/authController.js
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secreta-super-forte";

// ========================================
// Função auxiliar: gerar token JWT
// ========================================
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ========================================
// PASSAGEIRO - Registro
// ========================================
exports.registerPassenger = async (req, res) => {
  const { nome, cpf, telefone, email, senha } = req.body;

  if (!nome || !cpf || !telefone || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO usuario (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 'passageiro', NOW())
       RETURNING id, nome, cpf, telefone, email, role, created_at`,
      [nome, cpf, telefone, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error("Erro ao registrar passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao registrar passageiro" });
  }
};

// ========================================
// PASSAGEIRO - Login
// ========================================
exports.loginPassenger = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuario WHERE email = $1 AND role = 'passageiro'",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Passageiro não encontrado" });
    }

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);

    if (!senhaOk) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        cpf: user.cpf,
        telefone: user.telefone,
        email: user.email,
        role: user.role
      },
      token,
    });
  } catch (err) {
    console.error("Erro no login do passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ========================================
// MOTORISTA - Registro
// ========================================
exports.registerDriver = async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO usuario (nome, email, senha, role, created_at)
       VALUES ($1, $2, $3, 'motorista', NOW())
       RETURNING id, nome, email, role, created_at`,
      [nome, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error("Erro ao registrar motorista:", err.message);
    return res.status(500).json({ error: "Erro ao registrar motorista" });
  }
};

// ========================================
// MOTORISTA - Login
// ========================================
exports.loginDriver = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuario WHERE email = $1 AND role = 'motorista'",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Motorista não encontrado" });
    }

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);

    if (!senhaOk) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      },
      token,
    });
  } catch (err) {
    console.error("Erro no login do motorista:", err.message);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ========================================
// PERFIL - Usuário logado
// ========================================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, nome, cpf, telefone, email, role, created_at FROM usuario WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

// ========================================
// REFRESH TOKEN
// ========================================
exports.refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, nome, cpf, telefone, email, role FROM usuario WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];
    const newToken = generateToken(user);

    return res.json({ token: newToken });
  } catch (err) {
    console.error("Erro ao renovar token:", err.message);
    return res.status(500).json({ error: "Erro ao renovar token" });
  }
};

// ========================================
// LOGOUT - Invalida o token atual
// ========================================
exports.logout = async (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(400).json({ error: "Token não fornecido" });
  }

  try {
    await pool.query(
      "INSERT INTO token_blacklist (token, user_id) VALUES ($1, $2)",
      [token, req.user.id]
    );

    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("Erro no logout:", err.message);
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};
