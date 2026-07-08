// server/middleware/errorHandler.js
// -----------------------------------------------------------------------------
// Central Express error handler. Every controller wraps its body in try/catch
// and calls next(err); this function turns the error into a JSON response with
// the right status code. Known ApiErrors carry their own status; anything else
// is treated as a 500 and logged.
// -----------------------------------------------------------------------------
import { ApiError } from "./validation.js";

// Express recognises an error handler by its 4-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Bad ObjectId strings thrown by `new ObjectId(...)` -> treat as 400.
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // The native driver throws BSONError/BSONTypeError for malformed ids.
  if (err && (err.name === "BSONError" || err.name === "BSONTypeError")) {
    return res.status(400).json({ error: "Invalid id format." });
  }

  // Unexpected error — log it server-side, return a generic 500 to the client.
  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error." });
}
