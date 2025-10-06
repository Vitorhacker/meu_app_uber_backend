const pool = require("../db");

// ========================================
// PASSAGEIRO - Registro
// ========================================
exports.registerPassenger = async (req, res) => {
  const { nome, cpf, telefone, email, senha } = req.body;

  if (!nome || !cpf || !telefone || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Verifica se já existe usuário com o email ou CPF
    const exists = await pool.query(
      "SELECT id FROM usuarios WHERE email=$1 OR cpf=$2",
      [email, cpf]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Email ou CPF já cadastrado" });
    }

    // Cria usuário
    const result = await pool.query(
      `INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 'passageiro', NOW())
       RETURNING *`,
      [nome, cpf, telefone, email, senha]
    );

    const user = result.rows[0];

    // Gera token permanente
    const token = `token-${user.id}`;
    await pool.query(
      "UPDATE usuarios SET token_permanente=$1 WHERE id=$2",
      [token, user.id]
    );

    return res.status(201).json({
      user: { id: user.id, nome: user.nome, telefone: user.telefone },
      token,
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
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Passageiro não encontrado" });
    }

    const user = result.rows[0];

    if (user.senha !== senha) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    // Retorna token permanente
    let token = user.token_permanente;
    if (!token) {
      token = `token-${user.id}`;
      await pool.query(
        "UPDATE usuarios SET token_permanente=$1 WHERE id=$2",
        [token, user.id]
      );
    }

    return res.json({
      user: { id: user.id, nome: user.nome, telefone: user.telefone },
      token,
    });
  } catch (err) {
    console.error("Erro no login passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ========================================
// PERFIL, REFRESH e LOGOUT
// ========================================
exports.getProfile = async (req, res) => {
  const userId = req.userId; // setado pelo middleware verifyToken
  try {
    const result = await pool.query(
      "SELECT id, nome, email, telefone, role FROM usuarios WHERE id=$1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao obter perfil:", err.message);
    return res.status(500).json({ error: "Erro ao obter perfil" });
  }
};

exports.refreshToken = async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(
      "SELECT token_permanente FROM usuarios WHERE id=$1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json({ token: result.rows[0].token_permanente });
  } catch (err) {
    console.error("Erro ao atualizar token:", err.message);
    return res.status(500).json({ error: "Erro ao atualizar token" });
  }
};

exports.logout = async (req, res) => {
  const userId = req.userId;
  try {
    await pool.query("UPDATE usuarios SET token_permanente=NULL WHERE id=$1", [userId]);
    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("Erro no logout:", err.message);
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};
