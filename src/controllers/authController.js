const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ==========================
// Registro de usuário (passageiro)
// ==========================
exports.registerUser = async (req, res) => {
  try {
    console.log("🚀 Requisição de registro recebida:", req.body);
    const { nome, cpf, telefone, email, senha } = req.body;

    if (!nome || !cpf || !telefone || !email || !senha) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    // Checa duplicidade
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

    const hashedSenha = await bcrypt.hash(senha, 10);

    // Criar usuário
    const result = await pool.query(
      `INSERT INTO usuarios (nome, cpf, telefone, email, senha, role, created_at)
       VALUES ($1,$2,$3,$4,$5,'passageiro',NOW()) RETURNING *`,
      [nome, cpf, telefone, email, hashedSenha]
    );
    const user = result.rows[0];

    // Criar passageiro vinculado
    const passageiroResult = await pool.query(
      `INSERT INTO passageiros (user_id, nome, telefone)
       VALUES ($1,$2,$3) RETURNING *`,
      [user.id, nome, telefone]
    );
    const passageiro = passageiroResult.rows[0];

    // Gerar token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);

    // Armazena token permanente
    await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);

    console.log("✅ Usuário + passageiro criados com sucesso:", { user, passageiro });

    return res.status(201).json({
      message: "Conta criada com sucesso!",
      token,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone },
      passageiro,
    });
  } catch (err) {
    console.error("❌ Erro ao registrar usuário:", err);
    return res.status(500).json({ error: "Erro ao registrar usuário" });
  }
};

// ==========================
// Login passageiro
// ==========================
exports.loginUser = async (req, res) => {
  try {
    console.log("🚀 Requisição de login recebida:", req.body);
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });

    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1 AND role='passageiro'", [email]);
    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    const user = result.rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    let token = user.token_permanente;
    if (!token) {
      token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      await pool.query("UPDATE usuarios SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    }

    console.log("✅ Login bem-sucedido:", user);
    return res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone } });
  } catch (err) {
    console.error("❌ Erro no login:", err);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// ==========================
// Obter perfil
// ==========================
exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE id=$1", [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};
