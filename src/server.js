import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import db from "./db.js";

import authRoutes from "./routes/authRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import corridaRoutes from "./routes/corridaRoutes.js";
import pagamentoRoutes from "./routes/pagamentoRoutes.js";
import avaliacaoRoutes from "./routes/avaliacaoRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

// ==================== CORS (liberado) ====================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// =======
