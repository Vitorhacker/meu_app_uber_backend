const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ======================================================
// 🟢 REGISTRAR PASSAGEIRO
// ======================================================
exports.register = async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;
    console.log("🚀 Iniciando registro do passageiro:", { nome, email, cpf, telefone });

    // Verificar se já existe usuário com email ou cpf
    const existing = await pool.query(
      "SELECT * FROM passageiros WHERE email=$1 OR cpf=$2",
      [email, cpf]
    );
    if (existing.rows.length) {
      console.log("⚠️ Usuário já existe:", existing.rows[0].id);
      return res.status(400).json({ error: "Usuário já existe" });
    }

    // Inserir passageiro no banco
    const result = await pool.query(
      `INSERT INTO passageiros (nome, email, senha, cpf, telefone, criado_em)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [nome, email, senha, cpf, telefone]
    );

    const user = result.rows[0];
    if (!user) {
      console.error("❌ Falha ao inserir passageiro no banco");
      return res.status(500).json({ error: "Erro ao registrar usuário" });
    }

    console.log("📌 Passageiro inserido no banco:", user.id);

    // Criar token JWT
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET, { expiresIn: "7d" });
    console.log("📌 Token JWT gerado para passageiro:", token);

    // Salvar token permanente no banco
    await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    console.log("✅ Token salvo no banco para o passageiro:", user.id);

    return res.status(201).json({ user, token });

  } catch (err) {
    console.error("❌ Erro no registro do passageiro:", err);
    return res.status(500).json({ error: "Erro ao registrar usuário", details: err.message });
  }
};

// ======================================================
// 🟢 LOGIN DE PASSAGEIRO
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log("🚀 Tentando login do passageiro:", email);

    const result = await pool.query(
      "SELECT * FROM passageiros WHERE email=$1 AND senha=$2",
      [email, senha]
    );

    if (!result.rows.length) {
      console.warn("⚠️ Credenciais inválidas para login:", email);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];

    // Gerar token JWT
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET, { expiresIn: "7d" });
    console.log("📌 Token JWT gerado para login:", token);

    // Salvar token permanente no banco
    await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE id=$2", [token, user.id]);
    console.log("✅ Token salvo no banco após login:", user.id);

    return res.json({ user, token });

  } catch (err) {
    console.error("❌ Erro no login do passageiro:", err);
    return res.status(500).json({ error: "Erro ao realizar login", details: err.message });
  }
};

// ======================================================
// 🟢 OBTER PERFIL DO USUÁRIO PELO TOKEN
// ======================================================
exports.profile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn("⚠️ Token ausente na requisição de perfil");
      return res.status(401).json({ error: "Token ausente" });
    }

    const token = authHeader.split(" ")[1];
    console.log("📌 Token recebido para profile:", token);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("📌 Token decodificado:", decoded);

    const result = await pool.query("SELECT * FROM passageiros WHERE id=$1", [decoded.userId]);
    if (!result.rows.length) {
      console.warn("⚠️ Usuário não encontrado para ID:", decoded.userId);
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    console.log("✅ Perfil carregado com sucesso para ID:", decoded.userId);
    return res.json(result.rows[0]);

  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil", details: err.message });
  }
};
