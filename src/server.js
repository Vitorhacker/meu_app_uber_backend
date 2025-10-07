// server.js
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
const PORT = process.env.PORT || 8082;

// ======================================================
// Middlewares
// ======================================================
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ======================================================
// Banco de dados
// ======================================================
pool.connect()
  .then(client => {
    console.log("✅ Conexão com PostgreSQL estabelecida");
    client.release();
  })
  .catch(err => {
    console.error("❌ Erro ao conectar ao PostgreSQL:", err.message);
    process.exit(1);
  });

// ======================================================
// WebSocket
// ======================================================
io.on("connection", socket => {
    console.log("📡 Cliente conectado:", socket.id);
});
app.set("io", io);

// ======================================================
// Carregamento automático de rotas (com proteção)
// ======================================================
const loadedRoutes = new Set();
const routesPath = path.join(__dirname, "routes");

fs.readdirSync(routesPath).forEach(file => {
  if (file.endsWith("Routes.js")) {
    const name = file.replace("Routes.js", "").toLowerCase();

    if (loadedRoutes.has(name)) {
      console.warn(`⚠️  Rota duplicada ignorada: /api/${name}`);
      return;
    }

    try {
      const route = require(path.join(routesPath, file));
      app.use(`/api/${name}`, route);
      loadedRoutes.add(name);
      console.log(`📌 Rota carregada: /api/${name}`);
    } catch (err) {
      console.error(`❌ Falha ao carregar rota ${file}:`, err.message);
    }
  }
});

// ======================================================
// Alias manuais (apenas se necessário)
// ======================================================


// ======================================================
// Rota de retorno PicPay
// ======================================================
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

// ======================================================
// Middleware global de erros
// ======================================================
app.use((err, req, res, next) => {
  console.error("❌ Erro capturado:", err);
  if (err.type === "validation") {
    return res.status(400).json({ errors: err.errors });
  }
  res.status(500).json({ error: "Erro interno do servidor" });
});

// ======================================================
// Inicialização do servidor
// ======================================================
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
