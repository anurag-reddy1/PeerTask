# PeerTask — Design Document

## Description

PeerTask is a campus micro-task and service marketplace built for university students. Students can post one-off tasks they need help with (errand runs, furniture moves, tutoring sessions, proofreading), while other students can offer their skills as services (photography, bike repair, music lessons) with bookable availability slots. The platform connects peers within the same campus community, enabling lightweight peer-to-peer help and skill exchange without the friction of large commercial platforms.

---

## User Stories

1. **As a student with a task**, I want to post it with a budget and deadline so that other students can offer to help me, and I can pick the best offer.

2. **As a student willing to help**, I want to browse open tasks with a single search field that finds by title or location, and see whether the budget is hourly, daily, or a flat total, so that I can quickly find tasks that match my availability and submit an offer.

3. **As a student with a marketable skill**, I want to publish a service listing with my hourly rate and multiple availability slots — with the end time auto-suggested when I pick a start — so that peers can discover me and request bookings.

4. **As a student needing a service**, I want to browse service listings by a dropdown of real categories (not a free-text box), compare multiple providers side by side, and request a booking with auto-suggested end time.

5. **As a registered user**, I want a personal dashboard where I can see all my posted tasks, submitted offers, owned listings, and booking requests in one place so I never lose track of my activity.

6. **As a task poster**, I want the system to prevent two students from both "winning" the same task simultaneously, so the process is fair and conflict-free.

---

## Personas

### Persona 1 — Maya, The Overwhelmed Junior

**Background**: Maya is a 3rd-year CS student at Northeastern University. She juggles coursework, a part-time internship, and a campus research assistant role. She regularly needs small help: picking up a package, getting her essay proofread before a deadline, or finding someone to move her desk during room switch week.

**Goals**: Find reliable help quickly. Doesn't want to scroll endless Facebook groups. Wants to post a task, see offers, and accept the best one in under 5 minutes.

**Pain Points**: Doesn't trust random Craigslist strangers. Wants to see the helper's school affiliation and bio. Hates overpaying for trivial tasks.

**How PeerTask helps**: Maya posts a task with her budget, gets three offers within hours from verified students, and accepts the one she trusts.

---

### Persona 2 — Tyler, The Side-Hustle Photographer

**Background**: Tyler is a 4th-year Communications student who shoots events for fun. He has a DSLR, knows Lightroom well, and wants to monetize his weekends without committing to a full-time gig platform.

**Goals**: List his photography services with an hourly rate and available dates. Wants students to find him when they need a headshot or event photos.

**Pain Points**: Existing gig platforms charge steep commissions. Tyler doesn't have an audience yet to market through Instagram.

**How PeerTask helps**: Tyler creates a listing under the "Photography" category with his rate and upcoming available slots. Interested students book directly — no commission cut.

---

### Persona 3 — Priya, The Budget-Conscious Freshman

**Background**: Priya just moved into the dorms as a first-year student. She needs guitar lessons, her furniture assembled, and someone to give her a city orientation tour. She's on a tight budget and wants student prices, not professional rates.

**Goals**: Find affordable campus services from peers. Would rather pay a fellow student $15/hour than a professional $80/hour.

**Pain Points**: Doesn't know many people yet. Worried about getting scammed. Wants to read a bio and school affiliation before committing.

**How PeerTask helps**: Priya browses listings by category and max rate, reads provider bios, and books sessions with students vetted by the same university system.

---

### Persona 4 — James, The TA Looking for Extra Income

**Background**: James is a grad student in the Math department. He teaches undergrads as a TA but wants to earn additional money tutoring students in Calculus and Linear Algebra outside his TA hours.

**Goals**: List his tutoring service, set his availability to evenings and weekends, and fill his calendar with bookings from undergrads struggling with math.

**Pain Points**: The campus tutoring center takes a cut. He wants direct connections with students. Doesn't want to manage a whole freelance website.

**How PeerTask helps**: James creates a "Tutoring — Math" listing with $25/hr rate and his weekly available windows. Students find him via the listings browse page, filtered by "Tutoring" category.

---

### Persona 5 — Aisha, The Organized Senior

**Background**: Aisha is finishing her 4th year and uses PeerTask in multiple roles simultaneously — she's posted tasks (lab equipment transport), submitted offers on other students' tasks (proofreading), and created a listing for her social media consulting skills.

**Goals**: Manage all her PeerTask activity from one place. Wants to know at a glance which tasks are pending, which offers she's waiting on, and which bookings are coming up.

**Pain Points**: Hates switching between multiple views. Wants the status of every item (open, matched, confirmed, cancelled) clearly visible at a glance.

**How PeerTask helps**: The personal dashboard shows My Tasks, My Offers, My Listings, and My Bookings in separate pages with status badges, so Aisha always knows exactly what's happening.

---

## Design Choices

### Color Palette

PeerTask uses a custom design system built on top of Bootstrap 5, with CSS custom properties for all brand colors.

| Token | Value | Usage |
|---|---|---|
| `--pt-brand` | `#4a6ee0` (blue) | Brand accent — logo wordmark, hero headline, primary links |
| `--pt-brand-dark` | `#3558c4` | Link hover color (meets WCAG AA 4.5:1 on the page background) |
| `--pt-bg` | `#f6f7f9` (off-white) | Body background — warmer than pure white |
| `--pt-approve` | `#198754` | Accept/Confirm action buttons (`variant="success"`) |
| `--pt-cancel` | `#dc3545` | Decline/Cancel/Withdraw action buttons (`variant="outline-danger"`) |
| Card background | `#ffffff` | Bootstrap default card/navbar white |
| Status badges | Bootstrap `success / warning / secondary / danger` | open / pending / matched / cancelled |
| Border/shadow | Bootstrap `border-bottom shadow-sm` | Navbar separator |

Approve (green) and cancel (red) actions use distinct, semantically meaningful colors throughout the app — offer Accept/Decline on TaskDetail, booking Confirm/Cancel on ListingDetail, and Withdraw on MyOffers all follow this convention consistently.

### Typography

PeerTask loads two Google Fonts for a polished, student-friendly feel:

- **Body**: [Inter](https://fonts.google.com/specimen/Inter) — a clean, highly legible sans-serif designed for screen reading. Applied via `--pt-font-body` to `body`.
- **Headings**: [Poppins](https://fonts.google.com/specimen/Poppins) — a geometric sans-serif with a slightly playful feel. Applied via `--pt-font-heading` to all `h1`–`h6` elements.

Both are loaded from Google Fonts with `rel="preconnect"` to minimize FOUT. The fallback stack is `system-ui, sans-serif`.

### Layout

- **Navbar**: Fixed top, white background with bottom border and soft shadow. Expands on `lg` breakpoint; collapses to a hamburger on mobile. Navigation items grouped into two dropdowns ("Post", "My Account") when the user is logged in — keeps the bar uncluttered.
- **Page content**: Wrapped in a Bootstrap `Container` (max-width ~1140px, horizontally centered). Cards use `Col md={4}` grid for browse pages (3-column on desktop, 1-column on mobile).
- **Forms**: Centered narrow columns (`Col md={6}` or `Col md={8}`) for auth and create-task/listing forms.
- **Pagination**: Simple prev/next/page-N component at the bottom of browse pages. Shows total record count.

### Component Decisions

- **React-Bootstrap** was chosen over plain CSS for consistent, accessible UI components (Navbar, Card, Form, Button, Badge, Alert) with minimal custom CSS.
- **NavDropdown** was used to group six authenticated links into two dropdowns, reducing navbar visual clutter.
- **Pagination component** is generic (receives `page, pages, total, onPage` props) and reused on both BrowseTasks and BrowseListings.
- **ErrorMessage component** renders a dismissible Bootstrap `Alert` when an API call fails, standardizing error presentation across all pages.
- **ProtectedRoute** wraps authenticated-only routes, redirecting to `/login` if the session check returns `user: null`.

---

## Accessibility

- All Bootstrap form fields include `<Form.Label>` elements with matching `controlId` / `htmlFor` wiring, so screen readers announce each input's purpose. Dynamic inputs (slot start/end in CreateListing, all filter fields in BrowseTasks and BrowseListings) use computed `controlId` values.
- A skip-to-content link (`<a href="#main-content" className="skip-link">`) is the first focusable element in the DOM; it becomes visible on keyboard focus and lets screen-reader users bypass the navbar.
- The `<Navbar>` is wrapped in a `<header>` element with `aria-label="Main navigation"` on the `<Navbar>` itself; page content is wrapped in `<main id="main-content">`.
- The navbar hamburger toggle has `aria-controls="main-nav"` linking it to the collapsible panel.
- NavDropdown toggle IDs (`nav-post`, `nav-my`) are unique per page for correct ARIA associations.
- Status badges use Bootstrap's semantic color variants and always include the text label, so color is never the sole distinguishing signal. Warning badges (`bg-warning`) override text color to `#000` for WCAG AA contrast.
- All brand-color links and buttons meet WCAG AA 4.5:1 contrast on the `#f6f7f9` page background.
- Interactive cards include visible focus styles inherited from Bootstrap's focus-visible rules.
- Pagination buttons use `variant="outline-dark"` for sufficient contrast (was `outline-secondary`, which fell below 4.5:1).

---

## Architecture Overview

```
Browser (React SPA)
       │  fetch /api/*
       ▼
  Express Server
  ├── Passport session middleware (express-session + connect-mongo)
  ├── /api/auth    ─── authController   (register, login, logout, session)
  ├── /api/tasks   ─── taskController   (CRUD + browse aggregation)
  │     └── /api/tasks/:id/offers ── offerController (submit, respond, withdraw)
  ├── /api/listings ── listingController (CRUD + browse aggregation)
  │     └── /api/listings/:id/bookings ── bookingController (request, respond)
  ├── /api/offers/mine  ── offerController.myOffers
  └── /api/bookings/mine ── bookingController.myBookings
       │
  MongoDB Atlas
  ├── users        { name, email, passwordHash, school, bio }
  ├── tasks        { title, description, budget, location, availableAfter, status, posterUserId }
  ├── offers       { taskId, offerorUserId, message, price, status }
  ├── listings     { title, category, description, ratePerHour, availableFrom, availableTo, providerId, confirmedSlots[] }
  └── bookings     { listingId, requesterUserId, requestedFrom, requestedTo, status }
```

### Key architectural decisions:

**Same-origin serving** — In production, Express serves the Vite-built React bundle from `../client/dist`. No CORS configuration is needed; the browser and API share the same origin. The Vite dev server uses a proxy (`/api → localhost:3000`) to match this in development.

**Atomic concurrency guards** — Two endpoints use `findOneAndUpdate` with a filtering condition that acts as an optimistic lock:
- *Offer acceptance*: `{ _id, status: "open" }` — only the first concurrent accept wins; the rest get 409.
- *Booking confirmation*: uses a `$not/$elemMatch` overlap filter on `listing.confirmedSlots` — concurrent books for the same slot get 409.

**Aggregation pipelines** — Browse endpoints use `$match → $lookup (pending count) → $lookup (poster/provider) → $project → $sort → $skip/$limit` in a single round-trip rather than N+1 queries.

**No Mongoose** — The native MongoDB driver is used directly. Collections are accessed via a thin `collections` object (`db.collection("tasks")` etc.) exported from `config/db.js`.

---

## Wireframes

### Home Page (`/`)

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: PeerTask  Browse Tasks  Browse Listings     │
├─────────────────────────────────────────────────────┤
│                                                     │
│         Welcome to Peer[Task]                       │
│   Campus micro-tasks & services marketplace         │
│                                                     │
│   [Browse Tasks]      [Browse Listings]             │
│                                                     │
│  ────────────────────────────────────────────────  │
│  Post a Task ─ Have a job? Post it and get offers  │
│  Offer a Service ─ List your skills + availability  │
│  Connect with Peers ─ Trusted, same-campus only    │
└─────────────────────────────────────────────────────┘
```

---

### Browse Tasks (`/tasks`)

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR                                             │
├─────────────────────────────────────────────────────┤
│  Browse Tasks                        [Post a Task]  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Search[title or location] Min$[_] Max$[_]    │  │
│  │   📍 Boston (suggestion)                     │  │  ← location autocomplete
│  │   📍 Brooklyn (suggestion)                   │  │
│  │ After[____]           [Apply] [Clear]        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Task A   │  │ Task B   │  │ Task C   │         │
│  │ $20/hr   │  │ $45/day  │  │ $15      │         │  ← budget unit shown
│  │ 2 pending│  │ 0 pending│  │ 1 pending│         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│          [< Prev]  Page 1 of 12  [Next >]          │
└─────────────────────────────────────────────────────┘
```

---

### Browse Listings (`/listings`)

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR                                             │
├─────────────────────────────────────────────────────┤
│  Browse Listings                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Category [▾ Tutoring ▾]  Max$/hr[_]  After[_] │  │  ← dropdown picker
│  │                                [Apply][Clear] │  │
│  └──────────────────────────────────────────────┘  │
│  2 listings selected to compare   [Compare] [Clear] │  ← compare bar
│  ┌──────────────────────────────────────────────┐  │
│  │ Title  | Rate    | Category | Avail | Pending│  │  ← compare table
│  │ Guitar | $20/hr  | Music    | Jul 1 | 1      │  │
│  │ Photo  | $35/hr  | Photo    | Jul 5 | 0      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Guitar   │  │ Photo    │  │ Tutoring │         │
│  │ $20/hr   │  │ $35/hr   │  │ $25/hr   │         │
│  │ 1 pending│  │ 0 pending│  │ 3 pending│         │
│  │ □ Compare│  │ □ Compare│  │ □ Compare│         │  ← compare checkbox
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│          [< Prev]  Page 1 of 12  [Next >]          │
└─────────────────────────────────────────────────────┘
```

---

### Task Detail (`/tasks/:id`)

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR                                             │
├─────────────────────────────────────────────────────┤
│  ← Back to tasks                                    │
│                                                     │
│  [Task Title]                        [OPEN badge]  │
│  Posted by: Maya Chen · Northeastern               │
│  Budget: $30  |  Location: Curry Student Center    │
│  Available after: July 10, 2026                    │
│                                                     │
│  [Description paragraph …]                         │
│                                                     │
│  ── Offers (3) ───────────────────────────────────  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Tyler · $25 · "I can help this weekend"      │  │
│  │ [Accept] [Decline]                           │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Priya · $28 · "Available Friday afternoon"   │  │
│  │ [Accept] [Decline]                           │  │
│  └──────────────────────────────────────────────┘  │
│  ── Submit an Offer ───────────────────────────────  │
│  Price [$___]  Message [_________________________]  │
│                                        [Submit]    │
└─────────────────────────────────────────────────────┘
```

---

### Listing Detail (`/listings/:id`)

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR                                             │
├─────────────────────────────────────────────────────┤
│  ← Back to listings                                 │
│                                                     │
│  [Listing Title]                  [AVAILABLE badge] │
│  Provider: Tyler A. · Northeastern                 │
│  Category: Photography  |  Rate: $35/hr            │
│  Available: Jul 1 – Aug 31, 2026                   │
│                                                     │
│  [Bio / description paragraph …]                   │
│                                                     │
│  ── Request a Booking ─────────────────────────────  │
│  From [date/time ___]  To [date/time ___]          │
│                              [Request Booking]     │
│                                                     │
│  ── Bookings (owner view) ─────────────────────────  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Priya · Jul 15 10:00–12:00 · [pending]       │  │
│  │ [Confirm] [Cancel]                           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

### Login / Register Pages

```
┌──────────────────────────────┐
│  NAVBAR                      │
├──────────────────────────────┤
│                              │
│  Login                       │
│  Email    [________________] │
│  Password [________________] │
│                   [Login]    │
│  No account? Register here   │
└──────────────────────────────┘
```

Register includes: Name, Email, Password, School, Bio (optional).

---

### Personal Dashboard Pages (`/my/*`)

All four dashboard pages share the same layout:

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR (Post ▾  My Account ▾)                      │
├─────────────────────────────────────────────────────┤
│  My Tasks                                           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Move furniture   [OPEN]    $50 · July 12     │  │
│  │ [Edit] [Delete]                              │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Proofread essay  [MATCHED] $20 · July 5      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

My Offers and My Bookings additionally show the linked task/listing title and its current status.
