// client/src/pages/Home.jsx
// Landing page linking to both feature slices.
import "./Home.css";
import { Link } from "react-router-dom";
import { Row, Col, Card, Button } from "react-bootstrap";
import { useAuth } from "../../hooks/useAuth.jsx";

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <div className="text-center py-4">
        <h1 className="display-5 fw-bold">
          Peer<span className="brand-accent">Task</span>
        </h1>
        <p className="lead text-muted">
          A campus marketplace for micro-tasks and micro-services.
        </p>
        {user && <p className="text-muted">Welcome back, {user.name}.</p>}
      </div>

      <Row className="g-4">
        <Col md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Tasks</Card.Title>
              <Card.Text>
                Need a hand? Post a task, get offers from peers, and accept the
                best one.
              </Card.Text>
              <div className="d-flex gap-2">
                <Button as={Link} to="/tasks" variant="primary">
                  Browse Tasks
                </Button>
                {user && (
                  <Button as={Link} to="/tasks/new" variant="outline-secondary">
                    Post a Task
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Listings</Card.Title>
              <Card.Text>
                Offer a service, publish your availability, and confirm
                bookings.
              </Card.Text>
              <div className="d-flex gap-2">
                <Button as={Link} to="/listings" variant="primary">
                  Browse Listings
                </Button>
                {user && (
                  <Button
                    as={Link}
                    to="/listings/new"
                    variant="outline-secondary"
                  >
                    New Listing
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!user && (
        <p className="text-muted text-center mt-4">
          <Link to="/register">Create an account</Link> or{" "}
          <Link to="/login">log in</Link> to get started.
        </p>
      )}
    </div>
  );
}
