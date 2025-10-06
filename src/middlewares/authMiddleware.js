const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// Middleware para verificar token (JWT ou token permanente)
async function verifyToken(req, res, next) {
  const tokenHeader = req.headers["authorization"];
  if (!tokenHeader) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = tokenHeader.replace("Bearer ", "").trim();

  try {
    // 1️⃣ Tenta verificar como JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // payload do JWT
      return next();
    } catch (err) {
      // Não é JWT válido, tenta token permanente
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
      token_permanente: user.token_permanente
    };

    next();
  } catch (err) {
    console.error("Erro interno auth:", err.message);
    return res.status(500).json({ error: "Erro ao autenticar usuário", details: err.message });
  }
}

// Middleware para verificar role do usuário
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
