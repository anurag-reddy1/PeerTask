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

// One dropdown entry per availability slot — its date is the slot's own
// start date (matching what's already shown up in the Availability list
// above), NOT every individual day inside a wide multi-week slot. This is
// deliberately simple: a slot spanning Sep 10 → Oct 30 shows up once, as
// "Sep 10, 2026", rather than exploding into 50 separate days.
function buildDateOptions(slots) {
  return (slots || []).map((slot, index) => ({ index, slot }));
}

function formatDateLabel(dateLike) {
  return new Date(dateLike).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// yyyy-mm-dd for combining with a manually-typed "HH:MM" time, in local time
// (matches how availability slots were originally entered via datetime-local).
function toDateStr(dateLike) {
  const d = new Date(dateLike);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Add `hours` to a "HH:MM" time string, wrapping within the same day.
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
  // A slot is chosen by index (drives the date shown); start/end time typed manually.
  const [selectedSlotIndex, setSelectedSlotIndex] = useState("");
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
  const dateOptions = buildDateOptions(availableSlots);

  function setStart(e) {
    const value = e.target.value;
    setStartTime(value);
    setEndTime((prev) => (prev ? prev : addHoursToTime(value, 1)));
  }

  async function requestBooking(e) {
    e.preventDefault();
    setError(null);
    if (selectedSlotIndex === "" || !startTime || !endTime) {
      setError({
        status: 400,
        message: "Please choose a date and both a start and end time.",
      });
      return;
    }
    const chosenSlot = availableSlots[Number(selectedSlotIndex)];
    const dateStr = toDateStr(chosenSlot.start);
    const requestedSlot = {
      start: `${dateStr}T${startTime}`,
      end: `${dateStr}T${endTime}`,
    };
    try {
      await api.post(`/api/listings/${id}/bookings`, { requestedSlot });
      setSelectedSlotIndex("");
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
            {dateOptions.length === 0 ? (
              <p className="text-muted mb-0">
                No open dates right now — check back later.
              </p>
            ) : (
              <Form onSubmit={requestBooking}>
                <Row className="g-2 align-items-end">
                  <Col sm={4}>
                    <Form.Label>Date</Form.Label>
                    <Form.Select
                      value={selectedSlotIndex}
                      onChange={(e) => setSelectedSlotIndex(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select a date…
                      </option>
                      {dateOptions.map(({ index, slot }) => (
                        <option key={index} value={index}>
                          {formatDateLabel(slot.start)}
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
                  End time auto-fills 1 hour after the start — adjust either as
                  needed. Only dates the provider has actually listed as open
                  appear above.
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
