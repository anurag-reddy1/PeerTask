// client/src/pages/CreateListing.jsx
// Create a service listing with one or more availability slots.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Row, Col } from "react-bootstrap";
import { api } from "../services/api.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function CreateListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    rate: "",
  });
  // Availability slots are managed as a dynamic list of { start, end }.
  const [slots, setSlots] = useState([{ start: "", end: "" }]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function setSlot(i, key, value) {
    const next = slots.slice();
    next[i] = { ...next[i], [key]: value };
    setSlots(next);
  }
  function addSlot() {
    setSlots([...slots, { start: "", end: "" }]);
  }
  function removeSlot(i) {
    setSlots(slots.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        rate: Number(form.rate),
        availabilitySlots: slots.map((s) => ({ start: s.start, end: s.end })),
      };
      const res = await api.post("/api/listings", body);
      navigate(`/listings/${res.listing._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto shadow-sm" style={{ maxWidth: 640 }}>
      <Card.Body>
        <Card.Title as="h1" className="h3 mb-3">
          New Listing
        </Card.Title>
        <ErrorMessage error={error} />
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="listing-title">
            <Form.Label>Title</Form.Label>
            <Form.Control value={form.title} onChange={set("title")} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="listing-desc">
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
              <Form.Group className="mb-3" controlId="listing-category">
                <Form.Label>Category</Form.Label>
                <Form.Control
                  value={form.category}
                  onChange={set("category")}
                  placeholder="e.g. Tutoring"
                  required
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3" controlId="listing-rate">
                <Form.Label>Rate ($/hr)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={form.rate}
                  onChange={set("rate")}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <fieldset className="border rounded p-3 mb-3">
            <legend className="fs-6 text-muted float-none w-auto px-2">
              Availability slots
            </legend>
            {slots.map((s, i) => (
              <Row className="g-2 align-items-end mb-2" key={i}>
                <Col sm={5}>
                  <Form.Label className="small">Start</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={s.start}
                    onChange={(e) => setSlot(i, "start", e.target.value)}
                    required
                  />
                </Col>
                <Col sm={5}>
                  <Form.Label className="small">End</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={s.end}
                    onChange={(e) => setSlot(i, "end", e.target.value)}
                    required
                  />
                </Col>
                <Col sm={2}>
                  {slots.length > 1 && (
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => removeSlot(i)}
                    >
                      ✕
                    </Button>
                  )}
                </Col>
              </Row>
            ))}
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              onClick={addSlot}
            >
              + Add slot
            </Button>
          </fieldset>

          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Creating…" : "Create Listing"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
