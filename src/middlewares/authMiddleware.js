// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "supersegreto123";

// Middleware para verificar token (JWT ou token permanente)
async function verifyToken(req, res, next) {
  const tokenHeader = req.headers["authorization"];
  console.log("🔹 verifyToken - tokenHeader:", tokenHeader);

  if (!tokenHeader) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = tokenHeader.replace("Bearer ", "").trim();

  try {
    // 1️⃣ Verifica como JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.userId, role: "passageiro" }; // JWT sempre passageiro
      return next();
    } catch {
      // Se não for JWT, tenta token permanente
    }

    // 2️⃣ Verifica token permanente no banco
    const result = await pool.query(
      "SELECT id, nome, email, role, token_permanente FROM usuarios WHERE token_permanente=$1",
      [token]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    const user = result.rows[0];
    req.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      token_permanente: user.token_permanente,
    };

    next();
  } catch (err) {
    console.error("❌ verifyToken - Erro interno:", err.message);
    return res.status(500).json({ error: "Erro ao autenticar usuário", details: err.message });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
