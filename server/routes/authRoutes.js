// server/routes/authRoutes.js
// Shared auth routes. Only GET /session needs the guard; register/login/logout
// manage the session themselves.
import { Router } from "express";
import {
  register,
  login,
  logout,
  session,
} from "../controllers/authController.js";

const router = Router();

router.post("/register", register); // create account (bcrypt hash)
router.post("/login", login); // passport-local session login
router.post("/logout", logout); // destroy session
router.get("/session", session); // current user or null

export default router;
