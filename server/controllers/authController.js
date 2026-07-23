// server/controllers/authController.js
// -----------------------------------------------------------------------------
// Shared authentication controller: register, login, logout, session.
// Passwords are hashed with bcrypt; login uses passport-local; the current user
// is read from the session. The passwordHash is NEVER returned to the client.
// -----------------------------------------------------------------------------
import bcrypt from "bcrypt";
import passport from "passport";
import { collections } from "../config/db.js";
import {
  ApiError,
  requireNonEmptyString,
  optionalString,
} from "../middleware/validation.js";

const SALT_ROUNDS = 10;

// Strip sensitive fields before sending a user object to the client.
function publicUser(user) {
  if (!user) return null;
  // Copy and drop the hash so it can never be serialised to the client.
  const safe = { ...user };
  delete safe.passwordHash;
  return safe;
}

// POST /api/auth/register — create an account with a bcrypt-hashed password.
export async function register(req, res, next) {
  try {
    const name = requireNonEmptyString(req.body.name, "name");
    const email = requireNonEmptyString(req.body.email, "email").toLowerCase();
    const password = requireNonEmptyString(req.body.password, "password");
    const school = requireNonEmptyString(req.body.school, "school");
    const bio = optionalString(req.body.bio);

    // Very light email shape check — not a full RFC validator.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "A valid email address is required.");
    }
    if (password.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters.");
    }

    // Enforce unique emails at the app layer (a unique index is also created
    // on startup in connectDb() as a belt-and-braces guarantee).
    const existing = await collections.users().findOne({ email });
    if (existing) {
      throw new ApiError(409, "An account with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const doc = { name, email, passwordHash, school, bio };
    const result = await collections.users().insertOne(doc);
    const created = { ...doc, _id: result.insertedId };

    // Log the user in immediately after registering (establish the session).
    req.login(created, (err) => {
      if (err) return next(err);
      return res.status(201).json({ user: publicUser(created) });
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login — passport-local session login.
export function login(req, res, next) {
  // Custom callback so we can send JSON instead of Passport's default redirects.
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || "Login failed." });
    }
    // req.login establishes the session (calls serializeUser).
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ user: publicUser(user) });
    });
  })(req, res, next);
}

// POST /api/auth/logout — destroy the session.
export function logout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    // Fully destroy the server-side session and clear the cookie.
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      return res.json({ ok: true });
    });
  });
}

// GET /api/auth/session — return the current user, or { user: null } if not logged in.
export function session(req, res) {
  // req.user was set by deserializeUser (already passwordHash-free), but we run
  // it through publicUser again defensively.
  return res.json({ user: publicUser(req.user) });
}
