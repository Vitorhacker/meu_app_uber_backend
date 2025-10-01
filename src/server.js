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
// 🔌 WebSocket - Localização e Corrida Real
// ==========================
io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);

  // motorista envia localização
  socket.on("updateLocation", async (data) => {
    const { corrida_id, motorista_id, latitude, longitude } = data;
    try {
      await pool.query(`
        INSERT INTO driver_locations (driver_id, corrida_id, latitude, longitude, ultima_atualizacao)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET latitude=$3, longitude=$4, ultima_atualizacao=NOW()
      `, [motorista_id, corrida_id, latitude, longitude]);

      await pool.query(`
        UPDATE corridas
        SET motorista_latitude=$2, motorista_longitude=$3, updated_at=NOW()
        WHERE id=$1
      `, [corrida_id, latitude, longitude]);

      io.emit(`locationUpdate_${corrida_id}`, { motorista_id, latitude, longitude, updated_at: new Date() });
    } catch (err) {
      console.error("❌ Erro ao salvar localização do motorista:", err.message);
    }
  });

  // motorista aceita corrida
  socket.on("acceptRide", async (data) => {
    const { corrida_id, motorista_id } = data;
    try {
      const corridaRes = await pool.query(
        `UPDATE corridas
         SET motorista_id=$2, status='motorista_a_caminho', valor_motorista = valor_estimado*0.8
         WHERE id=$1 RETURNING *`,
        [corrida_id, motorista_id]
      );
      if (corridaRes.rows.length > 0) {
        const corrida = corridaRes.rows[0];
        io.emit(`rideUpdate_${corrida_id}`, { corrida });
      }
    } catch (err) {
      console.error("❌ Erro ao aceitar corrida via WS:", err.message);
    }
  });

  // motorista inicia corrida
  socket.on("startRide", async (data) => {
    const { corrida_id } = data;
    try {
      const result = await pool.query(
        `UPDATE corridas SET status='corrida_em_andamento', inicio_em=NOW()
         WHERE id=$1 RETURNING *`,
        [corrida_id]
      );
      if (result.rows.length > 0) {
        io.emit(`rideUpdate_${corrida_id}`, { corrida: result.rows[0] });
      }
    } catch (err) {
      console.error("❌ Erro ao iniciar corrida via WS:", err.message);
    }
  });

  // motorista finaliza corrida
  socket.on("finishRide", async (data) => {
    const { corrida_id, valor_final } = data;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const corridaRes = await client.query(
        `UPDATE corridas SET status='finalizada', fim_em=NOW(), valor_final=$1
         WHERE id=$2 RETURNING *`,
        [valor_final, corrida_id]
      );
      const corrida = corridaRes.rows[0];
      if (!corrida) throw new Error("Corrida não encontrada");

      const valor_motorista = valor_final * 0.8;
      const valor_plataforma = valor_final * 0.2;

      await client.query(
        `INSERT INTO pagamentos (corrida_id, passageiro_id, motorista_id, valor_total, valor_motorista, valor_plataforma, forma_pagamento, data_pagamento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [corrida_id, corrida.passageiro_id, corrida.motorista_id, valor_final, valor_motorista, valor_plataforma, corrida.forma_pagamento || "cartao"]
      );

      await client.query(
        `UPDATE wallets SET saldo = saldo + $1 WHERE user_id=$2`,
        [valor_motorista, corrida.motorista_id]
      );

      await client.query("COMMIT");

      io.emit(`rideUpdate_${corrida_id}`, {
        corrida: { ...corrida, valor_motorista, valor_plataforma }
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Erro ao finalizar corrida via WS:", err.message);
    } finally {
      client.release();
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
    const name = file.replace("Routes.js", "").toLowerCase();
    const basePath = `/api/${name}`;
    app.use(basePath, route);
    console.log(`📌 Rota carregada: ${basePath}`);
  }
});

// 🔄 Alias explícito para /api/corridas e /api/corrida
const corridaRoutes = require("./routes/corridaRoutes");
app.use("/api/corridas", corridaRoutes);
app.use("/api/corrida", corridaRoutes); // opcional (singular)

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
