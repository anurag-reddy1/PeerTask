// client/src/components/ErrorMessage.jsx
// Friendly error banner (React-Bootstrap Alert). Accepts an ApiError (or any
// Error). 409 conflicts get a warning color + an extra hint since they're
// expected in the concurrency demos.
import PropTypes from "prop-types";
import { Alert } from "react-bootstrap";

export default function ErrorMessage({ error }) {
  if (!error) return null;
  const is409 = error.status === 409;
  return (
    <Alert variant={is409 ? "warning" : "danger"}>
      {is409 && <strong>Conflict: </strong>}
      {error.message}
      {is409 && (
        <div className="small mt-1">
          Someone else got there first — this action can only succeed once.
        </div>
      )}
    </Alert>
  );
}

ErrorMessage.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    status: PropTypes.number,
  }),
};
