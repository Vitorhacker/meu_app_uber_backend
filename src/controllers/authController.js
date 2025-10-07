const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// Registrar passageiro e usuário
exports.registerPassenger = async (req, res) => {
  const { nome, email, telefone, cpf, senha } = req.body;

  try {
    // Criar usuário
    const userResult = await pool.query(
      `INSERT INTO usuarios (nome, email, telefone, cpf, senha, role)
       VALUES ($1,$2,$3,$4,$5,'passageiro') RETURNING *`,
      [nome, email, telefone, cpf, senha]
    );

    const user = userResult.rows[0];

    // Criar passageiro vinculado ao usuário
    const passageiroResult = await pool.query(
      `INSERT INTO passageiros (user_id, nome, telefone)
       VALUES ($1,$2,$3) RETURNING *`,
      [user.id, nome, telefone]
    );

    const passageiro = passageiroResult.rows[0];

    // Gerar token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      message: "Conta criada com sucesso!",
      success: true,
      token,
      user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone }
    });

  } catch (err) {
    console.error("❌ Erro ao registrar passageiro:", err.message);
    return res.status(500).json({ error: "Erro ao registrar passageiro" });
  }
};

// Login passageiro
exports.loginPassenger = async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1 AND senha=$2 AND role='passageiro'", [email, senha]);
    if (!result.rows.length) return res.status(401).json({ error: "Credenciais inválidas" });

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ success: true, token, user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// Obter perfil
exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE id=$1", [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};
