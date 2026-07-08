// client/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, Form, Button } from "react-bootstrap";
import { useAuth } from "../hooks/useAuth.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Where to send the user after login (default home).
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto shadow-sm" style={{ maxWidth: 460 }}>
      <Card.Body>
        <Card.Title as="h1" className="h3 mb-3">
          Log in
        </Card.Title>
        <ErrorMessage error={error} />
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="login-email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="login-password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </Button>
        </Form>
        <p className="text-muted mt-3 mb-1">
          No account? <Link to="/register">Register</Link>
        </p>
      </Card.Body>
    </Card>
  );
}
