// controllers/authController.js
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ==========================
// Registro passageiro
// ==========================
const registerPassenger = async (req, res) => {
  const { nome, cpf, telefone, email, senha } = req.body;

  if (!nome || !cpf || !telefone || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Checa duplicidade de email, cpf e telefone
    const existing = await pool.query(
      "SELECT id, email, cpf, telefone FROM usuarios WHERE email=$1 OR cpf=$2 OR telefone=$3",
      [email, cpf, telefone]
    );
    if (existing.rows.length > 0) {
      const conflict = existing.rows[0];
      if (conflict.email === email) return res.status(400).json({ error: "E-mail já cadastrado" });
      if (conflict.cpf === cpf) return res.status(400).json({ error: "CPF já cadastrado" });
      if (conflict.telefone === telefone) return res.status(400).json({ error: "Telefone já cadastrado" });
    }

    const hashedSenha = await bcrypt.hash(senha, 10);

    // Cria usuário
    const result = await pool.query(
      `INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 'passageiro', NOW())
       RETURNING *`,
      [nome, cpf, telefone, email, hashedSenha]
    );
    const user = result.rows[0];

    // Gera token JWT permanente
    const token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);

    // Armazena token permanente no banco
    await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);

    return res.status(201).json({
      message: "Conta criada com sucesso!",
      token,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone }
    });
  } catch (err) {
    console.error("Erro ao registrar passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao registrar passageiro" });
  }
};

// ==========================
// Login passageiro
// ==========================
const loginPassenger = async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'", [email]);
    if (!result.rows.length) return res.status(404).json({ error: "Passageiro não encontrado" });

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    let token = user.token_permanente;
    if (!token) {
      token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);
      await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    }

    return res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone }
    });
  } catch (err) {
    console.error("Erro no login:", err.message);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ==========================
// Perfil
// ==========================
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const result = await pool.query(
      "SELECT id, nome, telefone, email, role FROM usuarios WHERE id=$1",
      [userId]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err.message);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};

// ==========================
// Logout
// ==========================
const logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    await pool.query("UPDATE usuarios SET token_permanente=NULL WHERE id=$1", [userId]);
    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("Erro no logout:", err.message);
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};

module.exports = {
  registerPassenger,
  loginPassenger,
  getProfile,
  logout
};
