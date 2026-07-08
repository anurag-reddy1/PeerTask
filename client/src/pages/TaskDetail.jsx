// client/src/pages/TaskDetail.jsx
// Task detail: shows the task, its offers, an offer form (for non-owners), and
// accept/decline controls (for the poster). A lost accept race surfaces as a 409 banner.
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Form, Button, Badge, ListGroup, Spinner } from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtRange, fmtDate, statusVariant } from "../services/fmt.js";
import { useAuth } from "../hooks/useAuth.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [offers, setOffers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/tasks/${id}`);
      setTask(res.task);
      setOffers(res.offers);
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
  if (!task) return <ErrorMessage error={error} />;

  const isOwner = user && task.posterId === user._id;
  const myOffer =
    user &&
    offers.find((o) => o.helperId === user._id && o.status === "pending");

  async function submitOffer(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/api/tasks/${id}/offers`, { message });
      setMessage("");
      await load();
    } catch (err) {
      setError(err);
    }
  }

  // Accept/decline (poster only).
  async function respond(offerId, status) {
    setError(null);
    try {
      await api.put(`/api/tasks/${id}/offers/${offerId}`, { status });
      await load();
    } catch (err) {
      setError(err); // e.g. 409 if another accept won the race
    }
  }

  async function withdraw(offerId) {
    setError(null);
    try {
      await api.del(`/api/tasks/${id}/offers/${offerId}`);
      await load();
    } catch (err) {
      setError(err);
    }
  }

  async function deleteTask() {
    setError(null);
    try {
      await api.del(`/api/tasks/${id}`);
      navigate("/my/tasks");
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div>
      <Link to="/tasks" className="d-inline-block mb-3 text-muted">
        ← Back to tasks
      </Link>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start gap-2">
            <Card.Title as="h1" className="h3">
              {task.title}
            </Card.Title>
            <Badge bg={statusVariant(task.status)}>{task.status}</Badge>
          </div>
          <Card.Text>{task.description}</Card.Text>
          <div className="d-flex flex-wrap gap-3 text-muted small">
            <span>💵 ${task.budget}</span>
            <span>📍 {task.location}</span>
            <span>🕓 {fmtRange(task.timeWindow)}</span>
          </div>
          {isOwner && task.status === "open" && (
            <div className="mt-3">
              <Button variant="outline-danger" size="sm" onClick={deleteTask}>
                Delete task
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Offer form — visible to logged-in non-owners on open tasks. */}
      {user && !isOwner && task.status === "open" && (
        <Card className="shadow-sm mb-3">
          <Card.Body>
            <Card.Title as="h2" className="h5">
              Make an offer
            </Card.Title>
            <ErrorMessage error={error} />
            {myOffer ? (
              <p className="text-muted mb-0">
                You already have a pending offer on this task.
              </p>
            ) : (
              <Form onSubmit={submitOffer}>
                <Form.Group className="mb-3" controlId="offer-message">
                  <Form.Label>Message</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="primary">
                  Submit offer
                </Button>
              </Form>
            )}
          </Card.Body>
        </Card>
      )}

      {!user && (
        <p className="text-muted">
          <Link to="/login">Log in</Link> to make an offer.
        </p>
      )}

      {/* Offers list. Poster sees accept/decline; helpers can withdraw theirs. */}
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title as="h2" className="h5">
            Offers ({offers.length})
          </Card.Title>
          {/* Show accept/decline errors here for the poster / other viewers. */}
          {(isOwner || (user && !myOffer)) && <ErrorMessage error={error} />}
          {offers.length === 0 ? (
            <p className="text-muted mb-0">No offers yet.</p>
          ) : (
            <ListGroup variant="flush">
              {offers.map((o) => (
                <ListGroup.Item
                  key={o._id}
                  className="d-flex justify-content-between align-items-start gap-2"
                >
                  <div>
                    <strong>{o.helper?.name || "Unknown"}</strong>{" "}
                    <Badge bg={statusVariant(o.status)}>{o.status}</Badge>
                    <p className="mb-1">{o.message}</p>
                    <span className="text-muted small">
                      {fmtDate(o.createdAt)}
                    </span>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    {isOwner &&
                      task.status === "open" &&
                      o.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => respond(o._id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => respond(o._id, "declined")}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                    {user &&
                      o.helperId === user._id &&
                      o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => withdraw(o._id)}
                        >
                          Withdraw
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
