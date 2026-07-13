// server/seed_1000.js
// -----------------------------------------------------------------------------
// Synthetic data seeder — inserts 1,000+ records across all five collections
// (Users, Tasks, TaskOffers, Listings, Bookings) using the SAME connection
// config as the app (config/db.js — native MongoDB driver, no ODM).
//
// The emphasis is on realistic Listings & Bookings data: varied prices,
// categories, availability windows across past/future date ranges, and a
// realistic mix of booking statuses (pending / confirmed / cancelled).
//
// IMPORTANT: this CLEARS the five collections first, then reseeds. Run with:
//   npm run seed            (from the server/ directory)
// -----------------------------------------------------------------------------
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { connectDb, collections, closeDb } from "./config/db.js";

// ---------------------------------------------------------------------------
// Tunable volumes. Total comfortably exceeds 1,000 documents, with the bulk of
// the data in Listings + Bookings per the ownership focus of this slice.
// ---------------------------------------------------------------------------
const NUM_USERS = 120;
const NUM_TASKS = 180;
const NUM_LISTINGS = 260;
// TaskOffers and Bookings are derived from the above (see below), and together
// with the counts here push the grand total well past 1,000.

// ---------------------------------------------------------------------------
// Small deterministic-enough randomness helpers (plain Math.random is fine for
// a local seed script).
// ---------------------------------------------------------------------------
const rand = (n) => Math.floor(Math.random() * n); // 0..n-1
const randInt = (min, max) => min + rand(max - min + 1); // inclusive
const pick = (arr) => arr[rand(arr.length)];
const chance = (p) => Math.random() < p;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const addHours = (date, h) => new Date(date.getTime() + h * HOUR);
const addDays = (date, d) => new Date(date.getTime() + d * DAY);

const NOW = new Date();

// ---------------------------------------------------------------------------
// Reference vocab used to build human-readable synthetic content.
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie",
  "Avery", "Quinn", "Priya", "Wei", "Diego", "Sofia", "Omar", "Aisha",
  "Liam", "Noah", "Emma", "Olivia", "Ava", "Ethan", "Mia", "Lucas",
  "Isabella", "Mason", "Sophia", "Leo", "Nina", "Raj", "Yuki", "Hana",
];
const LAST_NAMES = [
  "Kim", "Patel", "Garcia", "Chen", "Nguyen", "Smith", "Johnson", "Lee",
  "Brown", "Martinez", "Davis", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Singh", "Khan", "Rossi", "Tanaka", "Silva", "Cohen", "Murphy", "Reddy",
];
const SCHOOLS = [
  "Northeastern University", "MIT", "Boston University", "Harvard University",
  "Tufts University", "Boston College", "UMass Boston", "Emerson College",
  "Berklee College of Music", "Wentworth Institute of Technology",
];

// Listing categories with title templates + a realistic hourly-rate band ($/hr).
const LISTING_CATEGORIES = [
  { category: "Tutoring", titles: ["Calculus Tutoring", "Organic Chemistry Help", "SAT Prep Sessions", "Statistics Tutoring", "Physics Problem Solving"], rate: [20, 60] },
  { category: "Coding Help", titles: ["React & JavaScript Mentoring", "Python for Beginners", "Data Structures Coaching", "Debugging & Code Review", "Full-Stack Project Help"], rate: [30, 90] },
  { category: "Music Lessons", titles: ["Guitar Lessons", "Piano for Beginners", "Vocal Coaching", "Music Theory 101", "Drum Lessons"], rate: [25, 70] },
  { category: "Photography", titles: ["Portrait Photo Session", "Event Photography", "Headshots for LinkedIn", "Product Photography", "Graduation Photos"], rate: [40, 150] },
  { category: "Graphic Design", titles: ["Logo & Brand Design", "Poster & Flyer Design", "Social Media Graphics", "Resume Design", "Slide Deck Polish"], rate: [25, 80] },
  { category: "Fitness Training", titles: ["Personal Training Session", "Yoga & Mobility", "Running Coaching", "Strength Program Design", "HIIT Bootcamp"], rate: [30, 75] },
  { category: "Language Exchange", titles: ["Spanish Conversation", "Mandarin Practice", "French Tutoring", "English (ESL) Coaching", "Japanese Basics"], rate: [15, 45] },
  { category: "Moving Help", titles: ["Dorm Move-Out Help", "Furniture Assembly", "Apartment Moving", "Heavy Lifting Crew", "Storage Unit Loading"], rate: [18, 40] },
  { category: "Cleaning", titles: ["Apartment Deep Clean", "Move-Out Cleaning", "Weekly Tidy-Up", "Kitchen & Bath Scrub", "Post-Party Cleanup"], rate: [20, 45] },
  { category: "Editing", titles: ["Essay Proofreading", "Thesis Editing", "Resume & Cover Letter Review", "Video Editing", "Podcast Audio Editing"], rate: [20, 65] },
];

const TASK_TEMPLATES = [
  { title: "Help moving a couch this weekend", location: "Mission Hill, Boston", budget: [40, 120] },
  { title: "Need a photographer for a birthday party", location: "Back Bay, Boston", budget: [80, 300] },
  { title: "Looking for a calculus tutor before finals", location: "Snell Library", budget: [30, 90] },
  { title: "Assemble an IKEA desk and shelf", location: "Fenway, Boston", budget: [25, 70] },
  { title: "Proofread my grad school essay", location: "Remote", budget: [20, 80] },
  { title: "Fix a bug in my React project", location: "Remote", budget: [40, 150] },
  { title: "Dog walking for a week", location: "Jamaica Plain", budget: [50, 140] },
  { title: "Design a logo for my club", location: "Remote", budget: [30, 120] },
  { title: "Deep clean my apartment before move-out", location: "Allston, Boston", budget: [60, 160] },
  { title: "Guitar lessons for a beginner", location: "Cambridge, MA", budget: [25, 75] },
  { title: "Ride to Logan Airport early morning", location: "Roxbury, Boston", budget: [20, 60] },
  { title: "Record and edit a short promo video", location: "Somerville, MA", budget: [90, 350] },
];

const DESCRIPTIONS = [
  "Flexible on timing and happy to work around your schedule.",
  "I've done this many times and come highly recommended by classmates.",
  "Quick turnaround and friendly, patient approach.",
  "Bring your questions — we'll tackle them step by step.",
  "Reliable, punctual, and detail-oriented.",
  "Great for beginners; no experience needed.",
  "I supply all the equipment and materials.",
  "Message me with details and I'll tailor the session to you.",
];

const OFFER_MESSAGES = [
  "Hi! I'd love to help with this — I'm available all week.",
  "I have experience with exactly this. Happy to chat about details.",
  "Can do this for the budget listed. When works for you?",
  "I'm nearby and can start right away.",
  "This is right in my wheelhouse — let me know if I can help.",
  "Available evenings and weekends. Looking forward to it!",
];

// Build a bcrypt hash ONCE and reuse it for every seeded user. Hashing 120
// times individually is needlessly slow and adds nothing for synthetic data —
// every seeded account shares the password "password123".
async function buildSharedHash() {
  return bcrypt.hash("password123", 10);
}

async function seed() {
  await connectDb();
  console.log("[seed] Connected. Clearing existing data…");

  // ---- 1. Wipe the five collections so reseeding is idempotent ------------
  await Promise.all([
    collections.users().deleteMany({}),
    collections.tasks().deleteMany({}),
    collections.taskOffers().deleteMany({}),
    collections.listings().deleteMany({}),
    collections.bookings().deleteMany({}),
  ]);

  // Belt-and-braces unique index on email (matches the app's uniqueness rule).
  await collections.users().createIndex({ email: 1 }, { unique: true });

  const passwordHash = await buildSharedHash();

  // ---- 2. Users ------------------------------------------------------------
  const userDocs = [];
  const seenEmails = new Set();
  for (let i = 0; i < NUM_USERS; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    // Index guarantees uniqueness even when name pairs repeat.
    const email = `${first}.${last}${i}@husky.neu.edu`.toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    userDocs.push({
      _id: new ObjectId(),
      name: `${first} ${last}`,
      email,
      passwordHash,
      school: pick(SCHOOLS),
      bio: chance(0.7) ? pick(DESCRIPTIONS) : "",
    });
  }
  await collections.users().insertMany(userDocs);
  console.log(`[seed] Inserted ${userDocs.length} users.`);

  const userIds = userDocs.map((u) => u._id);
  const pickUser = () => pick(userIds);

  // ---- 3. Tasks ------------------------------------------------------------
  const taskDocs = [];
  for (let i = 0; i < NUM_TASKS; i++) {
    const tpl = pick(TASK_TEMPLATES);
    // Time window: a 1–6 hour slot somewhere between 20 days ago and 45 ahead.
    const start = addHours(addDays(NOW, randInt(-20, 45)), randInt(8, 18));
    const end = addHours(start, randInt(1, 6));
    // Most tasks are open; a realistic minority are matched or completed.
    const status = chance(0.65)
      ? "open"
      : chance(0.6)
        ? "matched"
        : "completed";
    taskDocs.push({
      _id: new ObjectId(),
      title: tpl.title,
      description: pick(DESCRIPTIONS),
      budget: randInt(tpl.budget[0], tpl.budget[1]),
      timeWindow: { start, end },
      location: tpl.location,
      status,
      posterId: pickUser(),
      createdAt: addDays(NOW, -randInt(0, 40)),
    });
  }
  await collections.tasks().insertMany(taskDocs);
  console.log(`[seed] Inserted ${taskDocs.length} tasks.`);

  // ---- 4. TaskOffers -------------------------------------------------------
  // Each task gets 0–4 offers from helpers other than the poster.
  const offerDocs = [];
  for (const task of taskDocs) {
    const numOffers = randInt(0, 4);
    const usedHelpers = new Set([task.posterId.toString()]);
    for (let i = 0; i < numOffers; i++) {
      const helperId = pickUser();
      if (usedHelpers.has(helperId.toString())) continue; // no self/dup offers
      usedHelpers.add(helperId.toString());
      // Status mix reflects the task state where it makes sense.
      let status = "pending";
      if (task.status !== "open") {
        status = chance(0.4) ? "accepted" : "declined";
      } else if (chance(0.2)) {
        status = "withdrawn";
      }
      offerDocs.push({
        _id: new ObjectId(),
        taskId: task._id,
        helperId,
        message: pick(OFFER_MESSAGES),
        status,
        createdAt: addDays(task.createdAt, randInt(0, 3)),
      });
    }
  }
  await collections.taskOffers().insertMany(offerDocs);
  console.log(`[seed] Inserted ${offerDocs.length} task offers.`);

  // ---- 5. Listings ---------------------------------------------------------
  // Varied categories, prices, and availability windows spread across past and
  // future dates so browse filters (maxRate, category, availableAfter) all have
  // meaningful data to work against.
  const listingDocs = [];
  for (let i = 0; i < NUM_LISTINGS; i++) {
    const cat = pick(LISTING_CATEGORIES);
    const numSlots = randInt(1, 4);
    const availabilitySlots = [];
    for (let s = 0; s < numSlots; s++) {
      // Spread windows from ~15 days ago to ~50 days out.
      const slotStart = addHours(
        addDays(NOW, randInt(-15, 50)),
        randInt(8, 17)
      );
      const slotEnd = addHours(slotStart, randInt(1, 5));
      availabilitySlots.push({ start: slotStart, end: slotEnd });
    }
    listingDocs.push({
      _id: new ObjectId(),
      title: pick(cat.titles),
      description: pick(DESCRIPTIONS),
      category: cat.category,
      rate: randInt(cat.rate[0], cat.rate[1]),
      availabilitySlots,
      providerId: pickUser(),
      createdAt: addDays(NOW, -randInt(0, 45)),
      // Filled in below from any confirmed bookings so the atomic overlap guard
      // in bookingController stays consistent with seeded data.
      confirmedSlots: [],
    });
  }

  // ---- 6. Bookings ---------------------------------------------------------
  // Generated per-listing so we can keep confirmed slots non-overlapping on a
  // given listing (mirroring the real double-booking invariant).
  const bookingDocs = [];
  for (const listing of listingDocs) {
    const numBookings = randInt(0, 4);
    // Track which availability windows already hold a confirmed booking.
    const confirmedWindows = new Set();
    for (let i = 0; i < numBookings; i++) {
      // Requester must not be the provider.
      let requesterId = pickUser();
      if (requesterId.equals(listing.providerId)) continue;

      // Pick an availability window and carve a sub-slot inside it.
      const windowIdx = rand(listing.availabilitySlots.length);
      const window = listing.availabilitySlots[windowIdx];
      const windowHours = Math.max(
        1,
        Math.floor((window.end - window.start) / HOUR)
      );
      const dur = Math.min(randInt(1, 2), windowHours);
      const offset = randInt(0, windowHours - dur);
      const bStart = addHours(window.start, offset);
      const bEnd = addHours(bStart, dur);

      // Status mix: pending / confirmed / cancelled. A booking can only be
      // "confirmed" if its window isn't already confirmed for this listing.
      let status = chance(0.45)
        ? "pending"
        : chance(0.65)
          ? "confirmed"
          : "cancelled";
      if (status === "confirmed" && confirmedWindows.has(windowIdx)) {
        status = "pending"; // keep confirmed slots non-overlapping
      }

      const bookingId = new ObjectId();
      bookingDocs.push({
        _id: bookingId,
        listingId: listing._id,
        requesterId,
        requestedSlot: { start: bStart, end: bEnd },
        status,
        createdAt: addDays(listing.createdAt, randInt(0, 4)),
      });

      if (status === "confirmed") {
        confirmedWindows.add(windowIdx);
        listing.confirmedSlots.push({ bookingId, start: bStart, end: bEnd });
      }
    }
  }

  await collections.listings().insertMany(listingDocs);
  console.log(`[seed] Inserted ${listingDocs.length} listings.`);
  await collections.bookings().insertMany(bookingDocs);
  console.log(`[seed] Inserted ${bookingDocs.length} bookings.`);

  // ---- Summary -------------------------------------------------------------
  const total =
    userDocs.length +
    taskDocs.length +
    offerDocs.length +
    listingDocs.length +
    bookingDocs.length;
  console.log("[seed] ----------------------------------------");
  console.log(`[seed] Users:      ${userDocs.length}`);
  console.log(`[seed] Tasks:      ${taskDocs.length}`);
  console.log(`[seed] TaskOffers: ${offerDocs.length}`);
  console.log(`[seed] Listings:   ${listingDocs.length}`);
  console.log(`[seed] Bookings:   ${bookingDocs.length}`);
  console.log(`[seed] TOTAL:      ${total} documents`);
  console.log("[seed] Login with any seeded email + password 'password123'.");

  await closeDb();
  console.log("[seed] Done.");
}

seed().catch(async (err) => {
  console.error("[seed] Failed:", err);
  try {
    await closeDb();
  } catch {
    // ignore close errors during failure teardown
  }
  process.exit(1);
});
