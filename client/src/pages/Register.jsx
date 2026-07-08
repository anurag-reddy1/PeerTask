// client/src/pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Button } from "react-bootstrap";
import { useAuth } from "../hooks/useAuth.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    school: "",
    bio: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      navigate("/"); // logged in automatically after register
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
          Create your account
        </Card.Title>
        <ErrorMessage error={error} />
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="reg-name">
            <Form.Label>Name</Form.Label>
            <Form.Control value={form.name} onChange={set("name")} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="reg-email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={set("email")}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="reg-password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={form.password}
              onChange={set("password")}
              minLength={6}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="reg-school">
            <Form.Label>School</Form.Label>
            <Form.Control
              value={form.school}
              onChange={set("school")}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="reg-bio">
            <Form.Label>Bio (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.bio}
              onChange={set("bio")}
            />
          </Form.Group>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Creating…" : "Register"}
          </Button>
        </Form>
        <p className="text-muted mt-3 mb-0">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card.Body>
    </Card>
  );
}
