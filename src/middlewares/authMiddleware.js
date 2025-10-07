const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// Verifica token JWT ou token permanente
async function verifyToken(req, res, next) {
  const tokenHeader = req.headers["authorization"];
  if (!tokenHeader) return res.status(403).json({ error: "Token não fornecido" });

  const token = tokenHeader.replace("Bearer ", "").trim();
  console.log("[AuthMiddleware] Token recebido:", token);

  try {
    // 1️⃣ Tenta JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("[AuthMiddleware] Token JWT decodificado:", decoded);
      req.user = {
        id: decoded.userId,   // ⚠️ usa userId do token
        role: decoded.role,
      };
      return next();
    } catch (jwtErr) {
      console.warn("[AuthMiddleware] JWT inválido, tentando token permanente");
    }

    // 2️⃣ Tenta token permanente
    const result = await pool.query(
      "SELECT id, nome, email, role, telefone, token_permanente FROM passageiros WHERE token_permanente=$1",
      [token]
    );

    if (!result.rows.length) {
      console.warn("[AuthMiddleware] Token permanente inválido");
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    const user = result.rows[0];
    console.log("[AuthMiddleware] Token permanente válido, usuário:", user.id);

    req.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      telefone: user.telefone,
      token_permanente: user.token_permanente,
    };

    next();
  } catch (err) {
    console.error("❌ Erro interno authMiddleware:", err);
    return res.status(500).json({ error: "Erro ao autenticar usuário" });
  }
}

// Verifica role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: "Acesso negado" });
    next();
  };
}

module.exports = { verifyToken, requireRole };
