// controllers/authController.js
const pool = require("../db");
const bcrypt = require("bcrypt");

// ========================================
// PASSAGEIRO - Registro
// ========================================
exports.registerPassenger = async (req, res) => {
  const { nome, cpf, telefone, email, senha } = req.body;
  if (!nome || !cpf || !telefone || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Verifica se o email já existe
    const existing = await pool.query("SELECT id FROM usuarios WHERE email=$1", [email]);
    if (existing.rows.length) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    // Hash da senha
    const hashedSenha = await bcrypt.hash(senha, 10);

    // Cria usuário na tabela usuarios
    const result = await pool.query(
      `INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 'passageiro', NOW())
       RETURNING *`,
      [nome, cpf, telefone, email, hashedSenha]
    );

    const user = result.rows[0];

    // Gera token permanente único
    const permanentToken = `token-${user.id}`;
    await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [permanentToken, user.id]);

    return res.status(201).json({
      userId: user.id,
      token: permanentToken
    });
  } catch (err) {
    console.error("Erro ao registrar passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao registrar passageiro" });
  }
};

// ========================================
// PASSAGEIRO - Login
// ========================================
exports.loginPassenger = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'",
      [email]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Passageiro não encontrado" });
    }

    const user = result.rows[0];

    // Compara hash da senha
    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: "Senha incorreta" });

    // Retorna apenas token permanente
    let token = user.token_permanente;
    if (!token) {
      token = `token-${user.id}`;
      await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    }

    return res.json({
      user: { id: user.id, nome: user.nome, telefone: user.telefone },
      token
    });
  } catch (err) {
    console.error("Erro no login passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ========================================
// PERFIL
// ========================================
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: "Usuário não autenticado" });

    const result = await pool.query(
      "SELECT id, nome, telefone, email, role FROM usuarios WHERE id=$1",
      [user.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err.message);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};

// ========================================
// LOGOUT
// ========================================
exports.logout = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: "Usuário não autenticado" });

    // Opcional: invalidar token permanente
    await pool.query("UPDATE usuarios SET token_permanente=NULL WHERE id=$1", [user.id]);

    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("Erro no logout:", err.message);
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};
