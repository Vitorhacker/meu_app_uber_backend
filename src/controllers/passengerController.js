// controllers/passengerController.js
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ======================================================
// Criar passageiro com token permanente
// ======================================================
const createPassenger = async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;

    // 1️⃣ Validação de campos obrigatórios
    if (!nome || !email || !senha || !cpf || !telefone) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
    }

    // 2️⃣ Valida formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Informe um e-mail válido!" });
    }

    // 3️⃣ Valida força da senha
    const senhaRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!senhaRegex.test(senha)) {
      return res.status(400).json({ error: "Senha fraca! Use ao menos 6 caracteres, incluindo letras e números." });
    }

    // 4️⃣ Checa duplicidade de email, CPF e telefone
    const existingUser = await pool.query(
      "SELECT * FROM usuarios WHERE email=$1 OR cpf=$2 OR telefone=$3",
      [email, cpf, telefone]
    );
    if (existingUser.rows.length > 0) {
      const conflict = existingUser.rows[0];
      if (conflict.email === email) return res.status(400).json({ error: "E-mail já cadastrado!" });
      if (conflict.cpf === cpf) return res.status(400).json({ error: "CPF já cadastrado!" });
      if (conflict.telefone === telefone) return res.status(400).json({ error: "Telefone já cadastrado!" });
    }

    // 5️⃣ Cria usuário
    const hashedSenha = await bcrypt.hash(senha, 10);
    const userResult = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, cpf, telefone, criado_em, saldo, ativo, role)
       VALUES ($1,$2,$3,$4,$5,NOW(),0,TRUE,'passageiro') RETURNING *`,
      [nome, email, hashedSenha, cpf, telefone]
    );
    const user = userResult.rows[0];

    // 6️⃣ Cria passageiro vinculado
    const passengerResult = await pool.query(
      `INSERT INTO passageiros (user_id, nome, email, senha, cpf, telefone, created_at, saldo_carteira, metodo_pagamento_preferido)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),0,'cartao') RETURNING *`,
      [user.id, nome, email, hashedSenha, cpf, telefone]
    );
    const passenger = passengerResult.rows[0];

    // 7️⃣ Gera token JWT permanente
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET);

    // 8️⃣ Armazena token permanente no banco (usuarios e passageiros)
    await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE user_id=$2", [token, user.id]);

    // 9️⃣ Retorna sucesso com token permanente
    return res.status(201).json({
      message: "Conta criada com sucesso!",
      token,          // Token permanente para usar no AuthContext
      userId: user.id,
      passenger
    });

  } catch (err) {
    console.error("Erro ao criar passageiro:", err);
    return res.status(500).json({ error: "Não foi possível criar passageiro. Tente novamente mais tarde." });
  }
};

// ======================================================
// Login passageiro usando token permanente
// ======================================================
const loginPassenger = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'",
      [email]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Passageiro não encontrado" });

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    // Busca token permanente
    let token = user.token_permanente;
    if (!token) {
      token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET);
      await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
      await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE user_id=$2", [token, user.id]);
    }

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        cpf: user.cpf,
        telefone: user.telefone,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error("Erro no login passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

module.exports = { createPassenger, loginPassenger };
