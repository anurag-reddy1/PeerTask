// server/middleware/validation.js
// -----------------------------------------------------------------------------
// Manual input validation helpers.
// Each helper is small and composable; controllers call them and throw an
// ApiError(400, ...) on failure. Throwing keeps controllers linear and lets the
// central error handler format the response.
// -----------------------------------------------------------------------------

// ApiError carries an HTTP status so the central error handler knows what code
// to send. Controllers `throw new ApiError(status, message)`.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// Assert a value is a non-empty string (after trimming). Returns the trimmed value.
export function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `"${field}" must be a non-empty string.`);
  }
  return value.trim();
}

// Assert a value is a finite number > 0. Accepts numeric strings from forms.
export function requirePositiveNumber(value, field) {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) {
    throw new ApiError(400, `"${field}" must be a positive number.`);
  }
  return num;
}

// Optional string — returns trimmed string or '' if missing.
export function optionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Validate a { start, end } time window: both must be valid dates and start < end.
// Returns { start: Date, end: Date }.
export function requireTimeRange(range, field) {
  if (!range || typeof range !== "object") {
    throw new ApiError(400, `"${field}" must be an object with start and end.`);
  }
  const start = new Date(range.start);
  const end = new Date(range.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(
      400,
      `"${field}" must contain valid start and end dates.`
    );
  }
  if (start >= end) {
    throw new ApiError(400, `"${field}" start must be before end.`);
  }
  return { start, end };
}

// Validate an array of availability slots (each a { start, end } range).
export function requireSlotArray(slots, field) {
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      `"${field}" must be a non-empty array of time slots.`
    );
  }
  return slots.map((s, i) => requireTimeRange(s, `${field}[${i}]`));
}

// Guard that a requested status is one of the allowed values.
export function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new ApiError(
      400,
      `"${field}" must be one of: ${allowed.join(", ")}.`
    );
  }
  return value;
}
