import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

// Variável de ambiente para controle do envio de e-mails
const EMAIL_CONFIRMATION = process.env.EMAIL_CONFIRMATION || "off"; // "on" ou "off"

// ==================== REGISTER ====================
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Verifica se o usuário já existe
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Usuário já existe." });
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria o usuário no banco
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, confirmed) VALUES ($1, $2, $3, $4) RETURNING id, name, email, confirmed",
      [name, email, hashedPassword, EMAIL_CONFIRMATION === "on" ? false : true]
    );

    // Gera token JWT
    const token = jwt.sign(
      { id: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Se e-mail de confirmação estiver ON
    if (EMAIL_CONFIRMATION === "on") {
      return res.status(201).json({
        message: "Usuário registrado. Verifique seu e-mail para confirmar.",
      });
    }

    // Caso contrário, já retorna login direto
    return res.status(201).json({
      message: "Usuário registrado com sucesso.",
      token,
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Usuário não encontrado." });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(400).json({ message: "Senha incorreta." });
    }

    if (EMAIL_CONFIRMATION === "on" && !user.rows[0].confirmed) {
      return res.status(403).json({
        message: "Confirme seu e-mail antes de fazer login.",
      });
    }

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      message: "Login realizado com sucesso.",
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
};

// ==================== CONFIRMAR EMAIL ====================
const confirmEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await pool.query("UPDATE users SET confirmed = true WHERE id = $1", [
      decoded.id,
    ]);

    return res.json({ message: "E-mail confirmado com sucesso!" });
  } catch (error) {
    console.error("Erro na confirmação de e-mail:", error);
    return res.status(400).json({ message: "Token inválido ou expirado." });
  }
};

export { register, login, confirmEmail };
