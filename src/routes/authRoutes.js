import express from "express";
import { register, login, confirmEmail } from "../controllers/authController.js";

const router = express.Router();

// Registro e login
router.post("/register", register);
router.post("/login", login);

// Confirmação de e-mail
router.get("/confirm/:token", confirmEmail);

export default router;
