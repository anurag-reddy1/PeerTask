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
import { authGuard } from "../middleware/authGuard.js";

const router = Router();

router.post("/register", register); // create account (bcrypt hash)
router.post("/login", login); // passport-local session login
router.post("/logout", logout); // destroy session
router.get("/session", authGuard, session); // current user or 401

export default router;
