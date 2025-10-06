// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "secreta-super-forte";

// ========================================
// Middleware para verificar token (JWT ou token_permanente)
// ========================================
async function verifyToken(req, res, next) {
  const tokenHeader = req.headers["authorization"];

  if (!tokenHeader) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = tokenHeader.replace("Bearer ", "");

  try {
    // 1️⃣ Tenta verificar como JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // payload do JWT
      return next();
    } catch (err) {
      // ignora erro, tenta token_permanente
    }

    // 2️⃣ Verifica se é token permanente no banco
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE token_permanente=$1 AND role='passageiro'",
      [token]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    req.user = result.rows[0]; // popula req.user com passageiro
    next();
  } catch (err) {
    console.error("Erro no verifyToken:", err.message);
    return res.status(500).json({ error: "Erro ao autenticar usuário" });
  }
}

// ========================================
// Middleware para verificar role do usuário
// ========================================
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
