// server/config/db.js
// -----------------------------------------------------------------------------
// MongoDB connection using the NATIVE Node.js driver (no Mongoose / no ODM).
// A single MongoClient is created and reused across the whole process. We expose
// getDb() so controllers can grab collection handles without re-connecting.
// -----------------------------------------------------------------------------
import { MongoClient } from "mongodb";

// Read configuration from the environment with sensible local defaults so the
// project runs out-of-the-box. Locally the npm scripts load ".env" via Node's
// built-in `--env-file-if-exists` flag (no dotenv package); in
// deployment these come from real platform environment variables.
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "peertask";

// One shared client for the lifetime of the process.
const client = new MongoClient(MONGODB_URI);

let db = null;

// connectDb() opens the connection once and caches the Db handle.
export async function connectDb() {
  if (db) return db; // already connected — reuse it
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`[db] Connected to MongoDB "${DB_NAME}" at ${MONGODB_URI}`);
  return db;
}

// getDb() returns the cached handle. Throws if called before connectDb() so we
// fail loudly instead of silently using an undefined database.
export function getDb() {
  if (!db) {
    throw new Error("Database not initialised. Call connectDb() first.");
  }
  return db;
}

// Convenience accessors for the five collections used across the app.
export const collections = {
  users: () => getDb().collection("Users"),
  tasks: () => getDb().collection("Tasks"),
  taskOffers: () => getDb().collection("TaskOffers"),
  listings: () => getDb().collection("Listings"),
  bookings: () => getDb().collection("Bookings"),
};

// Gracefully close the client (used by seed script / tests).
export async function closeDb() {
  await client.close();
  db = null;
}
