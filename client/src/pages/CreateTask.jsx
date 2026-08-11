// client/src/pages/CreateTask.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Row, Col } from "react-bootstrap";
import { api } from "../services/api.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

// Given a datetime-local string, return one `hours` later in the same
// yyyy-MM-ddThh:mm format datetime-local inputs expect.
function addHours(datetimeLocal, hours) {
  if (!datetimeLocal) return "";
  const d = new Date(datetimeLocal);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(d.getHours() + hours);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function CreateTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    // Usability fix (issue: budget unit was ambiguous — per hour/day/total?).
    // Defaults to "total" so existing behavior/expectations are unchanged.
    budgetUnit: "total",
    location: "",
    start: "",
    end: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Usability fix: when a participant picks a start time, auto-suggest an end
  // time (start + 1hr) instead of leaving them to fill in both from scratch.
  // Only auto-fills when the user hasn't already set an end time themselves.
  function setStart(e) {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      start: value,
      end: prev.end ? prev.end : addHours(value, 1),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        budget: Number(form.budget),
        budgetUnit: form.budgetUnit,
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
            <Col sm={4}>
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
            <Col sm={4}>
              <Form.Group className="mb-3" controlId="task-budget-unit">
                <Form.Label>Budget type</Form.Label>
                <Form.Select value={form.budgetUnit} onChange={set("budgetUnit")}>
                  <option value="total">Total (flat amount)</option>
                  <option value="hourly">Per hour</option>
                  <option value="daily">Per day</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col sm={4}>
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
                  onChange={setStart}
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
                <Form.Text className="text-muted">
                  Auto-filled to 1 hour after the start time — adjust as needed.
                </Form.Text>
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
