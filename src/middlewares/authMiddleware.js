// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ======================================================
// Middleware: Verifica token (JWT ou token permanente)
// ======================================================
async function verifyToken(req, res, next) {
  const tokenHeader = req.headers["authorization"];
  if (!tokenHeader) {
    return res.status(403).json({ error: "Token não fornecido" });
  }

  const token = tokenHeader.replace("Bearer ", "").trim();

  try {
    // 1️⃣ Tenta verificar como JWT normal
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Não é JWT válido, tenta token permanente
    }

    // 2️⃣ Verifica token permanente no banco (usuarios)
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.role, u.token_permanente,
              p.id AS passageiro_id
       FROM usuarios u
       LEFT JOIN passageiros p ON p.user_id = u.id
       WHERE u.token_permanente = $1`,
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
      passageiro_id: user.passageiro_id || null
    };

    next();
  } catch (err) {
    console.error("Erro interno auth:", err.message);
    return res.status(500).json({ error: "Erro ao autenticar usuário", details: err.message });
  }
}

// ======================================================
// Middleware: Verifica role do usuário
// ======================================================
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
