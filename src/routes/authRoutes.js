// src/routes/authRoutes.js
import express from "express";
import { register, login, confirmarEmail } from "../controllers/authController.js";

const router = express.Router();

// Registro e login não exigem token
router.post("/register", register);
router.post("/login", login);

// Confirmação de e-mail (se habilitada no .env)
router.get("/confirm/:token", confirmarEmail);

export default router;
