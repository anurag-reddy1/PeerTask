// client/src/services/fmt.js
// Small display helpers shared across pages.

// Format an ISO date string into a compact local date+time.
export function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Format a {start, end} range.
export function fmtRange(range) {
  if (!range) return "";
  return `${fmtDate(range.start)} → ${fmtDate(range.end)}`;
}

// Turn a Date into the value a <input type="datetime-local"> expects.
export function toLocalInput(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  // Adjust for the timezone offset so the input shows local time.
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

// Map a domain status to a Bootstrap badge variant (bg="…").
export function statusVariant(status) {
  switch (status) {
    case "open":
    case "accepted":
    case "confirmed":
      return "success";
    case "matched":
      return "warning";
    case "pending":
      return "secondary";
    case "declined":
    case "cancelled":
    case "withdrawn":
      return "danger";
    case "completed":
      return "dark";
    default:
      return "secondary";
  }
}
