const { Pool } = require("pg");

let pool;

if (process.env.DATABASE_URL) {
  console.log("🌐 Usando DATABASE_URL (Railway/Produção)");

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    min: parseInt(process.env.PGPOOL_MIN || "2", 10),
    max: parseInt(process.env.PGPOOL_MAX || "10", 10),
    idleTimeoutMillis: parseInt(process.env.PGPOOL_IDLE_TIMEOUT || "30000", 10),
  });
} else {
  console.log("💻 Usando configuração local do PostgreSQL");

  pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    ssl: false,
    min: parseInt(process.env.PGPOOL_MIN || "2", 10),
    max: parseInt(process.env.PGPOOL_MAX || "10", 10),
    idleTimeoutMillis: parseInt(process.env.PGPOOL_IDLE_TIMEOUT || "30000", 10),
  });
}

pool
  .connect()
  .then(() => console.log("✅ Conectado ao PostgreSQL"))
  .catch((err) => console.error("❌ Erro ao conectar no PostgreSQL", err));

module.exports = pool;
