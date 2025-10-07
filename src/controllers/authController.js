const pool = require("../db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersegredo123";

// ======================================================
// 🟢 REGISTRAR PASSAGEIRO
// ======================================================
exports.register = async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;
    console.log("🚀 [AuthController] Registro iniciado:", { nome, email, cpf, telefone });

    const emailTrim = email.trim().toLowerCase();
    const cpfClean = cpf.replace(/\D/g, "");

    // Verificar se já existe passageiro
    const existing = await pool.query(
      "SELECT * FROM passageiros WHERE email=$1 OR cpf=$2",
      [emailTrim, cpfClean]
    );

    if (existing.rows.length) {
      const existingUser = existing.rows[0];
      const token = jwt.sign({ userId: existingUser.id, role: "passageiro" }, JWT_SECRET, { expiresIn: "7d" });
      await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE id=$2", [token, existingUser.id]);

      console.log("⚠️ Passageiro já existe, login automático:", { id: existingUser.id, token });
      return res.status(200).json({ user: existingUser, token });
    }

    // Inserir passageiro
    const result = await pool.query(
      `INSERT INTO passageiros (nome, email, senha, cpf, telefone, criado_em)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [nome, emailTrim, senha, cpfClean, telefone]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET, { expiresIn: "7d" });
    await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE id=$2", [token, user.id]);

    console.log("✅ Passageiro registrado:", { id: user.id, token });
    return res.status(201).json({ user, token });

  } catch (err) {
    console.error("❌ [AuthController] Erro no registro:", err);
    return res.status(500).json({ error: "Erro ao registrar usuário", details: err.message });
  }
};

// ======================================================
// 🟢 LOGIN DE PASSAGEIRO
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const emailTrim = email.trim().toLowerCase();
    console.log("🚀 [AuthController] Tentativa de login:", { email: emailTrim });

    const result = await pool.query(
      "SELECT * FROM passageiros WHERE email=$1 AND senha=$2",
      [emailTrim, senha]
    );

    if (!result.rows.length) {
      console.warn("⚠️ [AuthController] Credenciais inválidas");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, role: "passageiro" }, JWT_SECRET, { expiresIn: "7d" });
    await pool.query("UPDATE passageiros SET token_permanente=$1 WHERE id=$2", [token, user.id]);

    console.log("✅ Login realizado:", { id: user.id, token });
    return res.json({ user, token });

  } catch (err) {
    console.error("❌ [AuthController] Erro no login:", err);
    return res.status(500).json({ error: "Erro ao realizar login", details: err.message });
  }
};

// ======================================================
// 🟢 PERFIL DO PASSAGEIRO
// ======================================================
exports.profile = async (req, res) => {
  try {
    // ⚠️ Usa req.user do middleware verifyToken
    console.log("🚀 [AuthController] Buscando perfil, req.user:", req.user);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const result = await pool.query("SELECT * FROM passageiros WHERE id=$1", [req.user.id]);
    if (!result.rows.length) {
      console.warn("⚠️ [AuthController] Passageiro não encontrado, id:", req.user.id);
      return res.status(404).json({ error: "Passageiro não encontrado" });
    }

    const user = result.rows[0];
    console.log("✅ Perfil retornado:", { id: user.id, nome: user.nome, role: user.role });
    return res.json({ user });

  } catch (err) {
    console.error("❌ [AuthController] Erro ao buscar perfil:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil", details: err.message });
  }
};
