// client/src/pages/CreateListing.jsx
// Create a service listing with one or more availability slots.
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

  // Usability fix: when a participant sets a slot's start time and hasn't
  // already set an end time, auto-suggest start + 1hr instead of leaving both
  // fields blank. If they've already typed an end time, don't overwrite it.
  function setSlot(i, key, value) {
    const next = slots.slice();
    if (key === "start") {
      const currentEnd = next[i].end;
      next[i] = {
        ...next[i],
        start: value,
        end: currentEnd || addHours(value, 1),
      };
    } else {
      next[i] = { ...next[i], [key]: value };
    }
    setSlots(next);
  }
  function addSlot() {
    setSlots([...slots, { start: "", end: "" }]);
  }
  function removeSlot(i) {
    setSlots(slots.filter((_, idx) => idx !== i));
  }

  // Client-side pre-submit validation mirroring the server rules, so users get
  // immediate feedback in the form. The server remains the source of truth and
  // its 400 responses are surfaced through the same ErrorMessage banner below.
  function validate() {
    if (!form.title.trim()) return "Please enter a title.";
    if (!form.description.trim()) return "Please enter a description.";
    if (!form.category.trim()) return "Please enter a category.";
    const rate = Number(form.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return "Rate must be a positive number.";
    }
    if (slots.length === 0) return "Add at least one availability slot.";
    const now = Date.now();
    const parsed = [];
    for (const s of slots) {
      if (!s.start || !s.end)
        return "Each availability slot needs a start and end.";
      const start = new Date(s.start).getTime();
      const end = new Date(s.end).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return "Availability slots must have valid dates.";
      }
      if (start >= end) return "Each slot's start must be before its end.";
      if (end <= now) return "Availability slots must end in the future.";
      parsed.push({ start, end });
    }
    // Reject slots that overlap one another.
    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        return "Availability slots must not overlap one another.";
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const message = validate();
    if (message) {
      setError({ status: 400, message });
      return;
    }
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
                  <Form.Group controlId={`slot-${i}-start`}>
                    <Form.Label className="small">
                      Slot {i + 1} start
                    </Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={s.start}
                      onChange={(e) => setSlot(i, "start", e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group controlId={`slot-${i}-end`}>
                    <Form.Label className="small">Slot {i + 1} end</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={s.end}
                      onChange={(e) => setSlot(i, "end", e.target.value)}
                      required
                    />
                  </Form.Group>
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
            <Form.Text className="text-muted d-block mb-2">
              Setting a start time auto-fills the end time 1 hour later — adjust
              either field as needed.
            </Form.Text>
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
