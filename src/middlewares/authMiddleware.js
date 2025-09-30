// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "secreta-super-forte";

// ========================================
// Middleware para verificar token JWT
// ========================================
async function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const cleanToken = token.replace("Bearer ", "");

  try {
    // 1. Verifica se está na blacklist
    const check = await pool.query(
      "SELECT id FROM token_blacklist WHERE token = $1",
      [cleanToken]
    );

    if (check.rows.length > 0) {
      return res.status(401).json({ error: "Token expirado (logout realizado)" });
    }

    // 2. Decodifica JWT
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Erro no verifyToken:", err.message);
    return res.status(401).json({ error: "Token inválido ou expirado" });
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
