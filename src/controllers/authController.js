// controllers/authController.js
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

/**
 * =========================================================
 * 🚀 REGISTRO DE PASSAGEIRO (com logs detalhados)
 * =========================================================
 */
const registerPassenger = async (req, res) => {
  console.log("📥 [AUTH] Requisição recebida em /registerPassenger:", req.body);

  const { nome, cpf, telefone, email, senha } = req.body;

  if (!nome || !cpf || !telefone || !email || !senha) {
    console.warn("⚠️ [AUTH] Campos obrigatórios ausentes:", { nome, cpf, telefone, email, senha });
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // 🔹 1. Checa duplicidade
    console.log("🔍 [AUTH] Verificando duplicidade de CPF, e-mail ou telefone...");
    const existing = await pool.query(
      "SELECT id, email, cpf, telefone FROM usuarios WHERE email=$1 OR cpf=$2 OR telefone=$3",
      [email, cpf, telefone]
    );

    if (existing.rows.length > 0) {
      const conflict = existing.rows[0];
      console.warn("⚠️ [AUTH] Usuário já existente:", conflict);

      if (conflict.email === email)
        return res.status(400).json({ error: "E-mail já cadastrado" });
      if (conflict.cpf === cpf)
        return res.status(400).json({ error: "CPF já cadastrado" });
      if (conflict.telefone === telefone)
        return res.status(400).json({ error: "Telefone já cadastrado" });
    }

    // 🔹 2. Hash da senha
    console.log("🔐 [AUTH] Gerando hash da senha...");
    const hashedSenha = await bcrypt.hash(senha, 10);

    // 🔹 3. Inserção do usuário
    console.log("🧩 [AUTH] Inserindo novo passageiro no banco...");
    const insertQuery = `
      INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
      VALUES ($1, $2, $3, $4, $5, 'passageiro', NOW())
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [nome, cpf, telefone, email, hashedSenha]);
    const user = result.rows[0];
    console.log("✅ [AUTH] Passageiro criado com sucesso:", user);

    // 🔹 4. Criação do token
    console.log("🎟️ [AUTH] Gerando token JWT...");
    const token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);

    // 🔹 5. Armazena token permanente
    console.log("💾 [AUTH] Salvando token no banco...");
    await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);

    // 🔹 6. Resposta final
    console.log("🎉 [AUTH] Registro finalizado com sucesso!");
    return res.status(201).json({
      success: true,
      message: "Conta criada com sucesso!",
      token,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone },
    });
  } catch (err) {
    console.error("❌ [AUTH] Erro inesperado no registro:", err);
    return res.status(500).json({
      error: "Erro ao registrar passageiro",
      details: err.message,
    });
  }
};

/**
 * =========================================================
 * 🔑 LOGIN DE PASSAGEIRO (com logs)
 * =========================================================
 */
const loginPassenger = async (req, res) => {
  console.log("📥 [AUTH] Login recebido:", req.body);
  const { email, senha } = req.body;

  if (!email || !senha) {
    console.warn("⚠️ [AUTH] Campos ausentes no login.");
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'",
      [email]
    );
    if (!result.rows.length) {
      console.warn("⚠️ [AUTH] Passageiro não encontrado:", email);
      return res.status(404).json({ error: "Passageiro não encontrado" });
    }

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) {
      console.warn("⚠️ [AUTH] Senha incorreta para:", email);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    let token = user.token_permanente;
    if (!token) {
      console.log("🎟️ [AUTH] Gerando novo token JWT...");
      token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);
      await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    }

    console.log("✅ [AUTH] Login bem-sucedido:", user.id);
    return res.json({
      success: true,
      token,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone },
    });
  } catch (err) {
    console.error("❌ [AUTH] Erro no login:", err);
    return res.status(500).json({ error: "Erro ao fazer login", details: err.message });
  }
};

/**
 * =========================================================
 * 👤 PERFIL DO PASSAGEIRO
 * =========================================================
 */
const getProfile = async (req, res) => {
  console.log("📥 [AUTH] Solicitando perfil de usuário...");
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const result = await pool.query(
      "SELECT id, nome, telefone, email, role FROM usuarios WHERE id=$1",
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    console.log("✅ [AUTH] Perfil retornado com sucesso:", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ [AUTH] Erro ao buscar perfil:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil", details: err.message });
  }
};

/**
 * =========================================================
 * 🚪 LOGOUT
 * =========================================================
 */
const logout = async (req, res) => {
  console.log("📥 [AUTH] Solicitando logout...");
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    await pool.query("UPDATE usuarios SET token_permanente=NULL WHERE id=$1", [userId]);
    console.log("✅ [AUTH] Logout realizado com sucesso para o ID:", userId);
    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("❌ [AUTH] Erro no logout:", err);
    return res.status(500).json({ error: "Erro ao realizar logout", details: err.message });
  }
};

module.exports = {
  registerPassenger,
  loginPassenger,
  getProfile,
  logout,
};
