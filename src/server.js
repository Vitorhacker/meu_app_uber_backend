const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const corridaRoutes = require("./routes/corridaRoutes");
const pagamentoRoutes = require("./routes/pagamentoRoutes");
const avaliacaoRoutes = require("./routes/avaliacaoRoutes");

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());
if (process.env.ENABLE_REQUEST_LOGS === "true") {
  app.use(morgan(process.env.LOG_LEVEL || "dev"));
}

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/corridas", corridaRoutes);
app.use("/api/pagamentos", pagamentoRoutes);
app.use("/api/avaliacoes", avaliacaoRoutes);

app.get("/", (req, res) => res.send("🚀 Backend rodando"));

app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
