// testWebhookNode.js
const axios = require("axios");

const headers = {
  Authorization: "Bearer 0bd747e4-79e3-4257-b832-057200a810b38f694ca84560ab802a24c9d7a632641cde82-c522-4756-b973-9110f0570587",
  "Content-Type": "application/json",
};

const body = {
  id: "teste123",
  reference_id: "ref123",
  charges: [
    {
      id: "charge123",
      status: "PAID",
      amount: { value: 100 },
      payment_method: { type: "credit_card" },
    },
  ],
  customer: { email: "vitor.silva1261.vs3@gmail.com" },
};

axios
  .post("https://brilliant-motivation-production.up.railway.app/api/webhooks/pagbank", body, { headers })
  .then((res) => {
    console.log("✅ Webhook testado com sucesso:", res.status);
  })
  .catch((err) => {
    console.error("❌ Erro ao testar webhook:", err.response?.data || err.message);
  });
