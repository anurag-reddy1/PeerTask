// client/src/pages/CreateTask.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Row, Col } from "react-bootstrap";
import { api } from "../services/api.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function CreateTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    location: "",
    start: "",
    end: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        budget: Number(form.budget),
        location: form.location,
        // datetime-local values are local wall-clock; the browser converts to
        // ISO on new Date(). Server validates start < end.
        timeWindow: { start: form.start, end: form.end },
      };
      const res = await api.post("/api/tasks", body);
      navigate(`/tasks/${res.task._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto shadow-sm" style={{ maxWidth: 560 }}>
      <Card.Body>
        <Card.Title as="h1" className="h3 mb-3">
          Post a Task
        </Card.Title>
        <ErrorMessage error={error} />
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="task-title">
            <Form.Label>Title</Form.Label>
            <Form.Control value={form.title} onChange={set("title")} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="task-desc">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={form.description}
              onChange={set("description")}
              required
            />
          </Form.Group>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3" controlId="task-budget">
                <Form.Label>Budget ($)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={form.budget}
                  onChange={set("budget")}
                  required
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3" controlId="task-location">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  value={form.location}
                  onChange={set("location")}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3" controlId="task-start">
                <Form.Label>Starts</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={form.start}
                  onChange={set("start")}
                  required
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3" controlId="task-end">
                <Form.Label>Ends</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={form.end}
                  onChange={set("end")}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Posting…" : "Post Task"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
