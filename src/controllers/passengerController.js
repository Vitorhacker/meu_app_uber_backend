// controllers/passengerController.js
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersegredo123"; // idealmente usar process.env.JWT_SECRET

// ================================
// Criar Passageiro
// ================================
const createPassenger = async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;

    // 1️⃣ Verifica se usuário já existe
    const existingUser = await db("usuarios").where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    // 2️⃣ Cria usuário
    const hashedSenha = await bcrypt.hash(senha, 10);
    const [user] = await db("usuarios")
      .insert({
        nome,
        email,
        senha: hashedSenha,
        cpf,
        telefone,
        criado_em: new Date(),
        saldo: 0,
        ativo: true,
        role: "passageiro",
      })
      .returning("*");

    // 3️⃣ Cria passageiro vinculado ao usuário
    const [passenger] = await db("passageiros")
      .insert({
        user_id: user.id,
        nome,
        email,
        senha: hashedSenha,
        cpf,
        telefone,
        created_at: new Date(),
        saldo_carteira: 0,
        metodo_pagamento_preferido: "cartao",
      })
      .returning("*");

    // 4️⃣ Gera token JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

    // 5️⃣ Retorna resposta
    res.status(201).json({
      token,
      userId: user.id,
      passenger,
    });
  } catch (err) {
    console.error("🚨 Erro ao criar passageiro (detalhado):", {
      message: err.message,
      detail: err.detail,
      code: err.code,
      stack: err.stack,
    });
    res.status(500).json({ error: err.message || "Não foi possível criar passageiro" });
  }
};

module.exports = { createPassenger };
