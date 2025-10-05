// testPaymentFull.js
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

// Função para gerar CPF válido (apenas para testes)
function gerarCpfValido() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let d1 = (n[0]*10 + n[1]*9 + n[2]*8 + n[3]*7 + n[4]*6 + n[5]*5 + n[6]*4 + n[7]*3 + n[8]*2) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  let d2 = (n[0]*11 + n[1]*10 + n[2]*9 + n[3]*8 + n[4]*7 + n[5]*6 + n[6]*5 + n[7]*4 + n[8]*3 + d1*2) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return n.join("") + d1.toString() + d2.toString();
}

async function criarPagamento() {
  const orderData = {
    order_id: `teste_${Date.now()}`,
    amount: "100.00",  // agora é string com duas casas decimais
    customer: {
      name: "Vitor Silva",
      email: "vitor.silva1261.vs3@gmail.com",
      tax_id: gerarCpfValido()
    },
    payment_method: {
      type: "credit_card",
      card: {
        number: "4539620659922097",
        expiration_month: "12",
        expiration_year: "2030",
        cvv: "123",
        holder_name: "Vitor Silva"
      }
    },
    return_url: process.env.PAGBANK_RETURN_URL,
    callback_url: process.env.PAGBANK_CALLBACK_URL
  };

  try {
    const response = await axios.post(
      `${process.env.PAGBANK_API_BASE}/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAGBANK_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("✅ Pedido criado com sucesso:", response.data);
  } catch (err) {
    if (err.response) {
      console.error("❌ Erro ao criar order:", err.response.data);
    } else {
      console.error("❌ Erro ao criar order:", err.message);
    }
  }
}

criarPagamento();
