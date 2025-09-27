// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 🔧 Toggle global: ligar/desligar confirmação por e-mail
const FORCE_EMAIL_CONFIRMATION = false; // true = exige confirmação, false = acesso livre

// Função real de envio de e-mail com Nodemailer
async function sendEmail(to, subject, text) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Flash App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    console.log("📧 E-mail enviado com sucesso para:", to);
  } catch (err) {
    console.error("❌ Erro no envio de e-mail:", err);
    throw new Error("Falha no envio de e-mail");
  }
}

exports.register = async (req, res) => {
  try {
    const { nome, email, cpf, senha, role } = req.body;
    if (!nome || !email || !cpf || !senha) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // Verifica duplicidade de e-mail
    const existsEmail = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existsEmail.rows.length > 0) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    // Verifica duplicidade de CPF
    const existsCpf = await pool.query("SELECT id FROM usuarios WHERE cpf = $1", [cpf]);
    if (existsCpf.rows.length > 0) {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }

    const hashed = await bcrypt.hash(senha, 10);
    const status = FORCE_EMAIL_CONFIRMATION ? "pending" : "active";

    const q = `
      INSERT INTO usuarios (nome, email, cpf, senha, role, status)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, nome, email, cpf, role, status, created_at
    `;
    const result = await pool.query(q, [nome, email, cpf, hashed, role || "passageiro", status]);
    const user = result.rows[0];

    if (FORCE_EMAIL_CONFIRMATION) {
      // Gera código de confirmação
      const code = crypto.randomInt(100000, 999999).toString();
      await pool.query(
        `INSERT INTO confirmacoes_email (usuario_id, codigo, usado, expiracao)
         VALUES ($1,$2,false,NOW() + interval '15 minutes')`,
        [user.id, code]
      );

      await sendEmail(user.email, "Confirme sua conta", `Seu código é: ${code}`);

      return res.status(201).json({
        success: true,
        message: "Usuário registrado. Confirme o e-mail.",
        user,
      });
    }

    // Se não exige confirmação → já pode logar
    res.status(201).json({
      success: true,
      message: "Usuário registrado com sucesso!",
      user,
    });
  } catch (err) {
    console.error("[auth.register]", err);
    res.status(500).json({ error: "Erro no servidor", details: err.toString() });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(400).json({ error: "Senha inválida" });

    if (FORCE_EMAIL_CONFIRMATION && user.status === "pending") {
      return res.json({
        status: "pending",
        message: "Confirmação de e-mail pendente",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("[auth.login]", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

exports.confirm = async (req, res) => {
  if (!FORCE_EMAIL_CONFIRMATION) {
    return res.status(400).json({ error: "Confirmação de e-mail está desativada." });
  }

  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e código são obrigatórios" });
    }

    const userResult = await pool.query("SELECT id, status FROM usuarios WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }
    const user = userResult.rows[0];

    if (user.status !== "pending") {
      return res.status(400).json({ error: "Usuário já está ativo" });
    }

    const codeResult = await pool.query(
      `SELECT id, expiracao, usado FROM confirmacoes_email 
       WHERE usuario_id = $1 AND codigo = $2
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: "Código inválido" });
    }

    const confirm = codeResult.rows[0];
    if (confirm.usado) {
      return res.status(400).json({ error: "Código já utilizado" });
    }
    if (new Date(confirm.expiracao) < new Date()) {
      return res.status(400).json({ error: "Código expirado" });
    }

    await pool.query("UPDATE confirmacoes_email SET usado = true WHERE id = $1", [confirm.id]);
    await pool.query("UPDATE usuarios SET status = 'active' WHERE id = $1", [user.id]);

    res.json({ success: true, message: "Conta confirmada com sucesso" });
  } catch (err) {
    console.error("[auth.confirm]", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

exports.resendCode = async (req, res) => {
  if (!FORCE_EMAIL_CONFIRMATION) {
    return res.status(400).json({ error: "Reenvio de código está desativado." });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail obrigatório" });
    }

    const result = await pool.query("SELECT id, status FROM usuarios WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];
    if (user.status !== "pending") {
      return res.status(400).json({ error: "Usuário já está ativo" });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    await pool.query(
      `INSERT INTO confirmacoes_email (usuario_id, codigo, usado, expiracao)
       VALUES ($1, $2, false, NOW() + interval '15 minutes')`,
      [user.id, code]
    );

    await sendEmail(email, "Reenvio de Código de Confirmação", `Seu novo código é: ${code}`);

    res.json({ success: true, message: "Novo código enviado para o e-mail informado." });
  } catch (err) {
    console.error("[auth.resendCode]", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

// Exporta também sendEmail para testes manuais
exports.sendEmail = sendEmail;
