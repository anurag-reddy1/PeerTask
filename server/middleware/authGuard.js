// server/middleware/authGuard.js
// -----------------------------------------------------------------------------
// Authentication guard. Placed on every write route (POST/PUT/DELETE) and on
// GET /api/auth/session. Relies on Passport's req.isAuthenticated(), which is
// true only when a valid session exists and deserializeUser produced a user.
// -----------------------------------------------------------------------------
export function authGuard(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // 401 = not authenticated (as opposed to 403 = authenticated but forbidden).
  return res.status(401).json({ error: "Authentication required." });
}
