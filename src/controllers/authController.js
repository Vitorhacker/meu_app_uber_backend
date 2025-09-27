// src/controllers/authController.js
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../db.js"; // ✅ Corrigido o caminho do db.js

/**
 * Registro de usuário
 */
export const register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // 1. Verifica se usuário já existe
    const userExists = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "E-mail já registrado" });
    }

    // 2. Cria usuário
    const hashedPassword = await bcrypt.hash(senha, 10);
    const newUser = await db.query(
      "INSERT INTO users (nome, email, senha, confirmado) VALUES ($1, $2, $3, $4) RETURNING id, email, nome, confirmado",
      [nome, email, hashedPassword, process.env.ENABLE_EMAIL_CONFIRMATION === "true" ? false : true]
    );

    // 3. Gera token JWT
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    // 4. Checa se envio de e-mail está habilitado
    if (process.env.ENABLE_EMAIL_CONFIRMATION === "true") {
      try {
        await axios.post(process.env.N8N_WEBHOOK_URL, {
          email,
          nome,
          token,
        });
      } catch (err) {
        console.error("❌ Falha ao enviar e-mail de confirmação:", err.message);
      }

      return res.status(201).json({
        message: "Usuário registrado. Verifique seu e-mail para confirmar.",
      });
    }

    // 👉 Se confirmação de e-mail estiver OFF, já retorna login direto
    return res.status(201).json({
      message: "Usuário registrado com sucesso.",
      token,
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error("❌ Erro no registro:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

/**
 * Login de usuário
 */
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // 1. Busca usuário
    const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    // 2. Verifica senha
    const validPassword = await bcrypt.compare(senha, user.rows[0].senha);
    if (!validPassword) {
      return res.status(400).json({ error: "Senha incorreta" });
    }

    // 3. Verifica confirmação (se for exigida)
    if (process.env.ENABLE_EMAIL_CONFIRMATION === "true" && !user.rows[0].confirmado) {
      return res.status(403).json({ error: "Confirme seu e-mail antes de fazer login." });
    }

    // 4. Gera token JWT
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.json({
      message: "Login realizado com sucesso",
      token,
      user: {
        id: user.rows[0].id,
        nome: user.rows[0].nome,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error("❌ Erro no login:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

/**
 * Confirmação de e-mail (usada apenas se ENABLE_EMAIL_CONFIRMATION=true)
 */
export const confirm = async (req, res) => {
  try {
    const { token } = req.params;

    // Verifica token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Atualiza usuário como confirmado
    await db.query("UPDATE users SET confirmado = true WHERE id = $1", [decoded.id]);

    return res.json({ message: "E-mail confirmado com sucesso!" });
  } catch (err) {
    console.error("❌ Erro na confirmação de e-mail:", err);
    return res.status(400).json({ error: "Token inválido ou expirado." });
  }
};
