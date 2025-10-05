// testPaymentNode.js
const axios = require("axios");
require("dotenv").config();

// ======================
// Função para gerar CPF válido para testes
// ======================
function gerarCpfValido() {
  const randomDigits = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 9 }, randomDigits);

  const calcDig = (nums) => {
    let sum = nums.reduce((acc, val, i) => acc + val * (nums.length + 1 - i), 0);
    let d = 11 - (sum % 11);
    return d >= 10 ? 0 : d;
  };

  const d1 = calcDig(n);
  const d2 = calcDig([...n, d1]);
  return n.join("") + d1.toString() + d2.toString();
}

// ======================
// Dados do pedido
// ======================
const orderData = {
  order_id: `teste_${Date.now()}`,
  amount: "100.00",  // string com 2 casas decimais
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

// ======================
// Criar pagamento no PagBank (sandbox)
// ======================
async function criarPagamento() {
  try {
    const res = await axios.post(
      "https://sandbox.api.pagseguro.com/v1/payments",
      orderData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAGBANK_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Pedido criado com sucesso:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("❌ Erro ao criar order:", err.response.data);
    } else {
      console.error("❌ Erro desconhecido:", err.message);
    }
  }
}

// ======================
// Executa
// ======================
criarPagamento();
