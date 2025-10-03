// controllers/passengerController.js
const db = require("../db"); // sua conexão com o banco
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersegredo123"; // idealmente use process.env.JWT_SECRET

const createPassenger = async (req, res) => {
  try {
    const { nome, telefone, email, cpf, senha } = req.body;

    // 1️⃣ Verifica se o usuário já existe
    const check = await db("users").where({ email }).first();
    if (check) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    // 2️⃣ Cria usuário na tabela users
    const hashedSenha = await bcrypt.hash(senha, 10);
    const user = await db("users")
      .insert({
        email,
        senha_hash: hashedSenha,
        role: "passageiro",
        created_at: new Date(),
      })
      .returning("*")
      .then(rows => rows[0]);

    // 3️⃣ Cria passageiro vinculado ao user_id
    const passenger = await db("passengers")
      .insert({
        user_id: user.id,
        nome,
        telefone,
        cpf,
        created_at: new Date(),
      })
      .returning("*")
      .then(rows => rows[0]);

    // 4️⃣ Gera token JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

    // 5️⃣ Retorna token + userId + dados do passageiro
    res.status(201).json({
      token,
      userId: user.id,
      passenger,
    });
  } catch (err) {
    console.error("Erro ao criar passageiro:", err);
    res.status(500).json({ error: "Não foi possível criar passageiro" });
  }
};

module.exports = {
  createPassenger,
};
