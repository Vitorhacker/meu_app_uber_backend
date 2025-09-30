const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

let connectionString;
if (process.env.DATABASE_URL) {
  console.log("🌐 Usando DATABASE_URL (Railway/Produção)");
  connectionString = process.env.DATABASE_URL;
} else {
  console.log("💻 Usando configuração local do banco");
  connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("❌ Erro inesperado no pool do PostgreSQL:", err);
  process.exit(-1);
});

module.exports = pool;
