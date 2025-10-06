// src/controllers/authController.js
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

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

    // Cria usuário na tabela usuarios
    const result = await pool.query(
      `INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 'passageiro', NOW())
       RETURNING *`,
      [nome, cpf, telefone, email, hashedPassword]
    );

    const user = result.rows[0];

    // Gera token permanente
    const permanentToken = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);

    // Salva token permanente no usuário
    await pool.query(
      "UPDATE usuarios SET token_permanente=$1 WHERE id=$2",
      [permanentToken, user.id]
    );

    // Cria passageiro vinculado
    const passengerResult = await pool.query(
      `INSERT INTO passageiros (user_id, nome, email, senha, cpf, telefone, created_at, saldo_carteira, metodo_pagamento_preferido, token_permanente)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),0,'cartao',$7) RETURNING *`,
      [user.id, nome, email, hashedPassword, cpf, telefone, permanentToken]
    );

    const passenger = passengerResult.rows[0];

    return res.status(201).json({
      userId: user.id,
      token: permanentToken,
      passenger
    });
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
      "SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'",
      [email]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Passageiro não encontrado" });

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    // Puxa token permanente
    let token = user.token_permanente;
    if (!token) {
      token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);
      await pool.query(
        "UPDATE usuarios SET token_permanente=$1 WHERE id=$2",
        [token, user.id]
      );
    }

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        cpf: user.cpf,
        telefone: user.telefone,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error("Erro no login passageiro:", err.message);
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
      `INSERT INTO usuarios (nome, email, senha, role, created_at)
       VALUES ($1,$2,$3,'motorista',NOW())
       RETURNING *`,
      [nome, email, hashedPassword]
    );

    const user = result.rows[0];

    const permanentToken = jwt.sign({ id: user.id, role: "motorista" }, JWT_SECRET);

    await pool.query(
      "UPDATE usuarios SET token_permanente=$1 WHERE id=$2",
      [permanentToken, user.id]
    );

    return res.status(201).json({
      userId: user.id,
      token: permanentToken,
      user
    });
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
      "SELECT * FROM usuarios WHERE email=$1 AND role='motorista'",
      [email]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Motorista não encontrado" });

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    let token = user.token_permanente;
    if (!token) {
      token = jwt.sign({ id: user.id, role: "motorista" }, JWT_SECRET);
      await pool.query(
        "UPDATE usuarios SET token_permanente=$1 WHERE id=$2",
        [token, user.id]
      );
    }

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error("Erro no login motorista:", err.message);
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
      "SELECT id, nome, cpf, telefone, email, role, created_at FROM usuarios WHERE id=$1",
      [userId]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

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
      "SELECT id, nome, cpf, telefone, email, role FROM usuarios WHERE id=$1",
      [userId]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    const user = result.rows[0];
    const newToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);

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
  if (!token) return res.status(400).json({ error: "Token não fornecido" });

  try {
    await pool.query(
      "INSERT INTO token_blacklist (token, user_id) VALUES ($1,$2)",
      [token, req.user.id]
    );
    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("Erro no logout:", err.message);
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};
