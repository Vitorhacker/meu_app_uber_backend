// src/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const pool = require("./db");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ==========================
// ✅ Teste de conexão com PostgreSQL
// ==========================
pool.connect()
  .then(client => {
    console.log("✅ Conexão com PostgreSQL estabelecida com sucesso");
    client.release();
  })
  .catch(err => {
    console.error("❌ Erro ao conectar ao PostgreSQL:", err.message);
    process.exit(1);
  });

// ==========================
// 🔌 WebSocket
// ==========================
io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);
  // ... eventos WebSocket ...
});

// ==========================
// 🔄 Carregamento automático de rotas
// ==========================
const routesPath = path.join(__dirname, "routes");

fs.readdirSync(routesPath).forEach((file) => {
  if (file.endsWith("Routes.js")) {
    const route = require(path.join(routesPath, file));
    const name = file.replace("Routes.js", "").toLowerCase();
    const basePath = `/api/${name}`;
    app.use(basePath, route);
    console.log(`📌 Rota carregada automaticamente: ${basePath}`);
  }
});

// ==========================
// 🔧 Registro manual de rotas principais
// ==========================
try {
  const usuarioRoutes = require("./routes/usuarioRoutes");
  const authRoutes = require("./routes/authRoutes");
  const corridaRoutes = require("./routes/corridaRoutes");
  const pagamentoRoutes = require("./routes/pagamentoRoutes");
  const walletRoutes = require("./routes/walletRoutes");
  const cartaoRoutes = require("./routes/cartaoRoutes");
  const payoutRoutes = require("./routes/payoutRoutes");
  const supportRoutes = require("./routes/supportRoutes");
  const tarifasRoutes = require("./routes/tarifasRoutes");
  const withdrawRoutes = require("./routes/withdrawRoutes");
  const avaliacaoRoutes = require("./routes/avaliacaoRoutes");
  const locationRoutes = require("./routes/locationRoutes");

  app.use("/api/usuarios", usuarioRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/corrida", corridaRoutes);
  app.use("/api/pagamento", pagamentoRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/cartao", cartaoRoutes);
  app.use("/api/payout", payoutRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/tarifas", tarifasRoutes);
  app.use("/api/withdraw", withdrawRoutes);
  app.use("/api/avaliacao", avaliacaoRoutes);
  app.use("/api/location", locationRoutes);

  console.log("📌 Rotas principais registradas manualmente com sucesso");
} catch (err) {
  console.error("❌ Erro ao registrar rotas manuais:", err.message);
}

// ==========================
// 🔧 Registro manual de rotas críticas (garantia extra)
// ==========================
try {
  const passengerRoutes = require("./routes/passengerRoutes");
  app.use("/api/passenger", passengerRoutes);
  console.log("📌 Rota crítica carregada manualmente: /api/passenger");
} catch (err) {
  console.warn("⚠️ Não foi possível carregar passengerRoutes manualmente:", err.message);
}

// ==========================
// 🔁 Alias explícito para corridas
// ==========================
const corridaRoutes = require("./routes/corridaRoutes");
app.use("/api/corridas", corridaRoutes);
app.use("/api/corrida", corridaRoutes);

// ==========================
// 🔙 Rota de retorno PicPay
// ==========================
app.get("/app/checkout-return", (req, res) => {
  res.send(`
    <html>
      <head><title>Pagamento Processado</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <div style="background: white; border-radius: 10px; padding: 30px; max-width: 400px; margin: auto; box-shadow: 0px 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #22c55e;">✅ Pagamento em processamento!</h1>
          <p>Obrigado por utilizar nosso app.<br>Assim que o PicPay confirmar o pagamento, sua corrida será liberada automaticamente.</p>
        </div>
      </body>
    </html>
  `);
});

// ==========================
// ⚠️ Middleware global de erros
// ==========================
app.use((err, req, res, next) => {
  console.error("❌ Erro capturado:", err);
  if (err.type === "validation") return res.status(400).json({ errors: err.errors });
  return res.status(500).json({ error: "Erro interno do servidor" });
});

// ==========================
// 🚀 Inicia servidor
// ==========================
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
