// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "secreta-super-forte";

// ========================================
// Middleware para verificar token (JWT ou token_permanente)
// ========================================
async function verifyToken(req, res, next) {
  const tokenHeader = req.headers["authorization"];
  console.log("🔹 verifyToken - tokenHeader:", tokenHeader);

  if (!tokenHeader) {
    console.error("❌ verifyToken - Token não fornecido");
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = tokenHeader.replace("Bearer ", "").trim();
  console.log("🔹 verifyToken - token extraído:", token);

  try {
    // 1️⃣ Tenta verificar como JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("✅ verifyToken - JWT válido:", decoded);
      req.user = decoded; // payload do JWT
      return next();
    } catch (err) {
      console.warn("⚠️ verifyToken - Não é JWT válido, tentando token permanente...");
    }

    // 2️⃣ Verifica se é token permanente no banco
    const result = await pool.query(
      "SELECT id, nome, email, role, token_permanente FROM usuarios WHERE token_permanente=$1",
      [token]
    );

    if (!result.rows.length) {
      console.error("❌ verifyToken - Token permanente inválido ou não encontrado:", token);
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    const user = result.rows[0];
    console.log("✅ verifyToken - Token permanente válido para usuário:", user.id);

    // Popula req.user com dados importantes do usuário
    req.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      token_permanente: user.token_permanente
    };

    next();
  } catch (err) {
    console.error("❌ verifyToken - Erro interno:", err.message);
    return res.status(500).json({ error: "Erro ao autenticar usuário", details: err.message });
  }
}

// ========================================
// Middleware para verificar role do usuário
// ========================================
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      console.error("❌ requireRole - Acesso negado para usuário:", req.user?.id);
      return res.status(403).json({ error: "Acesso negado" });
    }
    console.log("✅ requireRole - Usuário autorizado:", req.user.id);
    next();
  };
}

module.exports = { verifyToken, requireRole };
