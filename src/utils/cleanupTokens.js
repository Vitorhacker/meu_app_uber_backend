// src/utils/cleanupTokens.js
const pool = require("../db");

// Tempo máximo de vida do token em segundos (mesmo do JWT)
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || 86400; // 24h

async function cleanupExpiredTokens() {
  try {
    // Remove tokens mais antigos que o tempo de expiração
    const result = await pool.query(
      `DELETE FROM token_blacklist 
       WHERE created_at < NOW() - INTERVAL '${JWT_EXPIRATION} seconds'`
    );

    if (result.rowCount > 0) {
      console.log(`🧹 Limpador: ${result.rowCount} tokens expirados removidos da blacklist`);
    }
  } catch (err) {
    console.error("Erro ao limpar tokens expirados:", err);
  }
}

module.exports = cleanupExpiredTokens;
