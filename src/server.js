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
const server = http.createServer(app); // servidor HTTP
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Teste de conexão inicial
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
// 🔌 WebSocket - Localização
// ==========================
io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);

  // motorista envia localização
  socket.on("updateLocation", async (data) => {
    const { user_id, latitude, longitude } = data;
    try {
      await pool.query(`
        INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
        VALUES ($1,$2,$3,NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET latitude=$2, longitude=$3, updated_at=NOW()
      `, [user_id, latitude, longitude]);

      // reenvia posição para passageiros
      io.emit("locationUpdate", { user_id, latitude, longitude, updated_at: new Date() });
    } catch (err) {
      console.error("Erro ao salvar localização:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

/**
 * 🔄 Carrega automaticamente todas as rotas da pasta ./routes
 */
const routesPath = path.join(__dirname, "routes");
fs.readdirSync(routesPath).forEach((file) => {
  if (file.endsWith("Routes.js")) {
    const route = require(path.join(routesPath, file));

    // gera prefixo a partir do nome do arquivo
    const name = file.replace("Routes.js", "").toLowerCase();
    const basePath = `/api/${name}`;

    app.use(basePath, route);
    console.log(`📌 Rota carregada: ${basePath}`);
  }
});

// Rota de retorno PicPay
app.get("/app/checkout-return", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Pagamento Processado</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f4f9;">
        <div style="background: white; border-radius: 10px; padding: 30px; max-width: 400px; margin: auto; box-shadow: 0px 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #22c55e;">✅ Pagamento em processamento!</h1>
          <p>Obrigado por utilizar nosso app.<br>
          Assim que o PicPay confirmar o pagamento,<br>
          sua corrida será liberada automaticamente.</p>
        </div>
      </body>
    </html>
  `);
});

// Middleware global de erros
app.use((err, req, res, next) => {
  console.error("❌ Erro capturado:", err);
  if (err.type === "validation") {
    return res.status(400).json({ errors: err.errors });
  }
  return res.status(500).json({ error: "Erro interno do servidor" });
});

// 🚀 agora usa server.listen em vez de app.listen
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
