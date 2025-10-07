const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ==========================
// Registro passageiro + usuário
// ==========================
exports.registerPassenger = async (req, res) => {
  try {
    console.log("🚀 Requisição de registro recebida:", req.body);

    const { nome, cpf, telefone, email, senha } = req.body;

    if (!nome || !cpf || !telefone || !email || !senha) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    // Verifica duplicidade
    const existing = await pool.query(
      "SELECT id, email, cpf, telefone FROM usuarios WHERE email=$1 OR cpf=$2 OR telefone=$3",
      [email, cpf, telefone]
    );

    if (existing.rows.length) {
      const conflict = existing.rows[0];
      if (conflict.email === email) return res.status(400).json({ error: "E-mail já cadastrado" });
      if (conflict.cpf === cpf) return res.status(400).json({ error: "CPF já cadastrado" });
      if (conflict.telefone === telefone) return res.status(400).json({ error: "Telefone já cadastrado" });
    }

    // Hash da senha
    const hashedSenha = await bcrypt.hash(senha, 10);

    // Cria usuário
    const userResult = await pool.query(
      `INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1,$2,$3,$4,$5,'passageiro',NOW())
       RETURNING id, nome, email, telefone`,
      [nome, cpf, telefone, email, hashedSenha]
    );

    const user = userResult.rows[0];

    // Cria passageiro vinculado
    const passageiroResult = await pool.query(
      `INSERT INTO passageiros (user_id, nome, telefone)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, nome, telefone`,
      [user.id, nome, telefone]
    );

    // Gera token JWT permanente
    const token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);
    await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);

    console.log("✅ Passageiro criado com sucesso:", { user, passageiro: passageiroResult.rows[0] });

    return res.status(201).json({
      message: "Conta criada com sucesso!",
      token,
      userId: user.id,
      user,
    });

  } catch (err) {
    console.error("❌ Erro ao registrar passageiro:", err);
    return res.status(500).json({ error: "Erro ao registrar usuário" });
  }
};

// ==========================
// Login passageiro
// ==========================
exports.loginPassenger = async (req, res) => {
  try {
    console.log("🚀 Requisição de login recebida:", req.body);

    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'",
      [email]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Passageiro não encontrado" });

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    let token = user.token_permanente;
    if (!token) {
      token = jwt.sign({ id: user.id, role: "passageiro" }, JWT_SECRET);
      await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    }

    console.log("✅ Login bem-sucedido:", user);

    return res.json({
      token,
      userId: user.id,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone },
    });

  } catch (err) {
    console.error("❌ Erro no login passageiro:", err);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ==========================
// Perfil passageiro
// ==========================
exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nome, email, telefone, role FROM usuarios WHERE id=$1", [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};

// ==========================
// Logout passageiro
// ==========================
exports.logout = async (req, res) => {
  try {
    await pool.query("UPDATE usuarios SET token_permanente=NULL WHERE id=$1", [req.user.id]);
    console.log(`🚪 Usuário ${req.user.id} deslogado`);
    return res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    console.error("❌ Erro no logout:", err);
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};
