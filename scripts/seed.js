// scripts/seed.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const categorias = [
  { nome: "flash", descricao: "Entrega rápida de pequenos volumes", tarifa_base: 3, preco_por_km: 1.2, preco_por_min: 0.3 },
  { nome: "hatch", descricao: "Viagens econômicas em carros hatch", tarifa_base: 5, preco_por_km: 1.5, preco_por_min: 0.4 },
  { nome: "sedan", descricao: "Viagens confortáveis em sedans espaçosos", tarifa_base: 7, preco_por_km: 2, preco_por_min: 0.5 },
  { nome: "luxo", descricao: "Carros premium com máximo conforto", tarifa_base: 15, preco_por_km: 4, preco_por_min: 1 },
  { nome: "moto", descricao: "Corridas rápidas de moto", tarifa_base: 4, preco_por_km: 1, preco_por_min: 0.2 },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🌱 Inserindo categorias padrão...");

    for (const cat of categorias) {
      await client.query(
        `INSERT INTO ride_categories (nome, descricao, tarifa_base, preco_por_km, preco_por_min)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nome) DO NOTHING;`,
        [cat.nome, cat.descricao, cat.tarifa_base, cat.preco_por_km, cat.preco_por_min]
      );
    }

    console.log("✅ Categorias inseridas com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao executar seed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
