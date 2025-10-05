// testWebhook.js
const axios = require("axios");
require("dotenv").config();

const WEBHOOK_URL = process.env.PAGBANK_CALLBACK_URL; // deve ser /api/webhooks/pagbank
const TOKEN = process.env.PAGBANK_TOKEN;              // Token do PagBank

async function testWebhook() {
  try {
    const body = {
      id: "pag_123456",
      reference_id: "ref_98765",
      customer: { email: "vitor.silva1261.vs3@gmail.com" },
      charges: [
        {
          id: "charge_1",
          status: "PAID",
          amount: { value: 50.0 },
          payment_method: { type: "credit_card" }
        }
      ]
    };

    const response = await axios.post(WEBHOOK_URL, body, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ Webhook testado com sucesso:", response.status);

  } catch (err) {
    if (err.response) {
      console.error("❌ Erro ao testar webhook:", err.response.status, err.response.data);
    } else {
      console.error("❌ Erro ao testar webhook:", err.message);
    }
  }
}

testWebhook();
