// client/src/hooks/useAuth.jsx
// -----------------------------------------------------------------------------
// Auth context + hook. On mount it calls GET /api/auth/session to learn whether
// there is an active session (the cookie is sent automatically). Exposes the
// current user plus login/register/logout helpers that update the shared state.
// -----------------------------------------------------------------------------
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // current user or null
  const [loading, setLoading] = useState(true); // still checking the session?

  // Check for an existing session once, on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/api/auth/session");
        if (!cancelled) setUser(data.user);
      } catch {
        // 401 (not logged in) -> no user; ignore the error.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const data = await api.post("/api/auth/register", form);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout", {});
    setUser(null);
  }, []);

  const value = { user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Hook used throughout the app to read auth state.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
