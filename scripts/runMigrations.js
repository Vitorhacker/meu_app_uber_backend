// scripts/runMigrations.js
import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

// Caminho para o schema.sql
const schemaPath = path.resolve("sql/schema.sql");

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERRO: A variável DATABASE_URL não está definida no .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Railway/Heroku geralmente precisa disso
    },
  });

  try {
    await client.connect();
    console.log("📦 Conectado ao banco de dados via DATABASE_URL.");

    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("🚀 Executando migrações...");
    await client.query(schema);

    console.log("✅ Migrações concluídas com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao rodar migrações:", err.message);
  } finally {
    await client.end();
    console.log("🔌 Conexão fechada.");
  }
}

runMigrations();
