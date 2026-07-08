// server/config/session.js
// -----------------------------------------------------------------------------
// express-session configuration. The session id is stored in an HTTP-only
// cookie; the session data itself lives server-side (default MemoryStore for
// default MemoryStore — swap for a persistent store in production).
// -----------------------------------------------------------------------------
import session from "express-session";

export function buildSession() {
  return session({
    // Secret used to sign the session id cookie. Override via env in production.
    secret: process.env.SESSION_SECRET || "peertask-dev-secret-change-me",
    resave: false, // don't re-save unchanged sessions
    saveUninitialized: false, // don't create sessions until something is stored
    cookie: {
      httpOnly: true, // JS on the page cannot read the cookie (XSS hardening)
      sameSite: "lax", // same-origin app, so lax is a safe default
      secure: false, // set true behind HTTPS in production
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  });
}
