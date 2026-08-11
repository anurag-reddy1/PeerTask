// client/src/pages/ListingDetail.jsx
// Listing detail: availability, a booking-request form (non-owners), and
// confirm/cancel controls. A double-booked slot surfaces as a 409 banner.
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  Form,
  Button,
  Badge,
  ListGroup,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtRange, fmtDate, statusVariant } from "../services/fmt.js";
import { useAuth } from "../hooks/useAuth.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

// Usability fix (issue: participants had to manually type start/end times for
// a booking, with no guarantee it fit the listing's availability). A slot is
// considered fully booked — and excluded — only when an existing CONFIRMED
// booking completely covers it (start <= slot.start && end >= slot.end).
function isSlotFullyBooked(slot, confirmedSlots) {
  const s = new Date(slot.start).getTime();
  const e = new Date(slot.end).getTime();
  return (confirmedSlots || []).some((c) => {
    const cs = new Date(c.start).getTime();
    const ce = new Date(c.end).getTime();
    return cs <= s && ce >= e;
  });
}

// Follow-up refinement: rather than booking one whole (often multi-day) slot
// in one click, the participant now picks a specific DATE from a dropdown
// (built from the open slots) and types the exact TIME themselves. Enumerates
// every calendar day covered by the open slots, deduplicated and sorted.
function enumerateDates(slots) {
  const seen = new Set();
  (slots || []).forEach((s) => {
    const cursor = new Date(s.start);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(s.end);
    // Safety cap so a data error (e.g. a multi-year slot) can't hang the UI.
    let guard = 0;
    while (cursor <= end && guard < 366) {
      seen.add(cursor.toISOString().slice(0, 10)); // yyyy-mm-dd
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
  });
  return Array.from(seen).sort();
}

// Pretty-print a yyyy-mm-dd string without timezone surprises.
function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Add `hours` to a "HH:MM" time string, wrapping within the same day (24h
// clock). Simple by design — crossing midnight just wraps back to 00:xx
// rather than rolling onto the next calendar date, since the date is picked
// separately here.
function addHoursToTime(time, hours) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = (h + hours) % 24;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(total)}:${pad(m)}`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [bookings, setBookings] = useState([]);
  // Date comes from a dropdown; start/end time are typed manually.
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/listings/${id}`);
      setListing(res.listing);
      setBookings(res.bookings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }
  if (!listing) return <ErrorMessage error={error} />;

  const isOwner = user && listing.providerId === user._id;

  // Only slots that aren't already fully booked feed the date dropdown.
  const availableSlots = (listing.availabilitySlots || []).filter(
    (s) => !isSlotFullyBooked(s, listing.confirmedSlots)
  );
  const availableDates = enumerateDates(availableSlots);

  function setStart(e) {
    const value = e.target.value;
    setStartTime(value);
    // Auto-suggest an end time 1 hour later, same pattern as the other forms,
    // but only if the participant hasn't already set one themselves.
    setEndTime((prev) => (prev ? prev : addHoursToTime(value, 1)));
  }

  async function requestBooking(e) {
    e.preventDefault();
    setError(null);
    if (!selectedDate || !startTime || !endTime) {
      setError({
        status: 400,
        message: "Please choose a date and both a start and end time.",
      });
      return;
    }
    const requestedSlot = {
      start: `${selectedDate}T${startTime}`,
      end: `${selectedDate}T${endTime}`,
    };
    try {
      await api.post(`/api/listings/${id}/bookings`, { requestedSlot });
      setSelectedDate("");
      setStartTime("");
      setEndTime("");
      await load();
    } catch (err) {
      // A 409 here means the slot overlaps an already-confirmed booking; a
      // 400 means the typed time fell outside the listing's availability.
      // Both are already friendly messages from the server — just show them.
      if (err.status === 409) {
        setError({
          status: 409,
          message:
            err.message ||
            "That time slot is already booked. Please pick a different time.",
        });
      } else {
        setError(err);
      }
    }
  }

  // Confirm/cancel a booking.
  async function respond(bookingId, status) {
    setError(null);
    try {
      await api.put(`/api/listings/${id}/bookings/${bookingId}`, { status });
      await load();
    } catch (err) {
      setError(err); // 409 if the slot was already confirmed for someone else
    }
  }

  async function deleteListing() {
    setError(null);
    try {
      await api.del(`/api/listings/${id}`);
      navigate("/my/listings");
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div>
      <Link to="/listings" className="d-inline-block mb-3 text-muted">
        ← Back to listings
      </Link>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start gap-2">
            <Card.Title as="h1" className="h3">
              {listing.title}
            </Card.Title>
            <Badge bg="primary">${listing.rate}/hr</Badge>
          </div>
          <Card.Text>{listing.description}</Card.Text>
          <Badge bg="light" text="dark" className="mb-2">
            {listing.category}
          </Badge>
          <h3 className="h6 mt-2">Availability</h3>
          <ul className="text-muted mb-0">
            {listing.availabilitySlots?.map((s, i) => (
              <li key={i}>🕓 {fmtRange(s)}</li>
            ))}
          </ul>
          {isOwner && (
            <div className="mt-3">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={deleteListing}
              >
                Delete listing
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Booking request form — logged-in non-owners. */}
      {user && !isOwner && (
        <Card className="shadow-sm mb-3">
          <Card.Body>
            <Card.Title as="h2" className="h5">
              Request a booking
            </Card.Title>
            <ErrorMessage error={error} />
            {availableDates.length === 0 ? (
              <p className="text-muted mb-0">
                No open dates right now — check back later.
              </p>
            ) : (
              <Form onSubmit={requestBooking}>
                <Row className="g-2 align-items-end">
                  <Col sm={4}>
                    <Form.Label>Date</Form.Label>
                    <Form.Select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select a date…
                      </option>
                      {availableDates.map((d) => (
                        <option key={d} value={d}>
                          {formatDateLabel(d)}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col sm={3}>
                    <Form.Label>Start time</Form.Label>
                    <Form.Control
                      type="time"
                      value={startTime}
                      onChange={setStart}
                      required
                    />
                  </Col>
                  <Col sm={3}>
                    <Form.Label>End time</Form.Label>
                    <Form.Control
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </Col>
                  <Col sm={2}>
                    <Button type="submit" variant="primary">
                      Request
                    </Button>
                  </Col>
                </Row>
                <Form.Text className="text-muted d-block mt-2">
                  End time auto-fills 1 hour after the start — adjust either
                  as needed. Pick a date the provider has listed as open
                  above; the exact time just needs to fall within their
                  availability window that day.
                </Form.Text>
              </Form>
            )}
          </Card.Body>
        </Card>
      )}

      {!user && (
        <p className="text-muted">
          <Link to="/login">Log in</Link> to request a booking.
        </p>
      )}

      {/* Bookings list — owner sees confirm/cancel; requesters can cancel theirs. */}
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title as="h2" className="h5">
            Bookings ({bookings.length})
          </Card.Title>
          {(isOwner || user) && <ErrorMessage error={error} />}
          {bookings.length === 0 ? (
            <p className="text-muted mb-0">No bookings yet.</p>
          ) : (
            <ListGroup variant="flush">
              {bookings.map((b) => (
                <ListGroup.Item
                  key={b._id}
                  className="d-flex justify-content-between align-items-start gap-2"
                >
                  <div>
                    <strong>{b.requester?.name || "Unknown"}</strong>{" "}
                    <Badge bg={statusVariant(b.status)}>{b.status}</Badge>
                    <p className="mb-1">🕓 {fmtRange(b.requestedSlot)}</p>
                    <span className="text-muted small">
                      {fmtDate(b.createdAt)}
                    </span>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    {isOwner && b.status === "pending" && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => respond(b._id, "confirmed")}
                      >
                        Confirm
                      </Button>
                    )}
                    {(isOwner || (user && b.requesterId === user._id)) &&
                      b.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => respond(b._id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
