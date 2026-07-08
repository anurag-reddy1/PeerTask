// client/src/services/api.js
// -----------------------------------------------------------------------------
// Tiny fetch wrapper. Uses the browser-native Fetch API ONLY (no Axios).
//   - credentials: 'include' so the session cookie is sent on every request
//     (same-origin, but explicit is safer).
//   - JSON in / JSON out.
//   - On a non-2xx response it throws an ApiError carrying the status + server
//     message, so components can show friendly errors (including 409 conflicts).
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, url, body) {
  const opts = {
    method,
    credentials: "include", // send/receive the session cookie
    headers: {},
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  // 204 / empty bodies -> return null.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  return data;
}

// Convenience verbs. Query params are built with URLSearchParams.
export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  put: (url, body) => request("PUT", url, body),
  del: (url) => request("DELETE", url),
};

// Build a query string from an object, skipping empty values.
export function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      sp.append(k, v);
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}
