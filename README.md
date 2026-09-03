# automationintesting.online — E2E suite (Playwright + TypeScript)

End-to-end suite for **Restful Booker Platform v2.2** at
<https://automationintesting.online> — a Bed & Breakfast demo with a public booking
site, an admin panel and its own REST API.

28 test cases (`TEST_CASES.md`), 37 executable tests, one Chromium project.
Last full run: **37 passed in 34s** with 4 workers and retries disabled.

- `TEST_CASES.md` — the cases, with the eleven that were rewritten because the
  application disagreed with them.
- `STRATEGY.md` — architecture, isolation on a shared site, redundancy, coverage
  gaps, trade-offs, and the sixteen defects and oddities found.

---

## Install and run

Requires Node 18 or newer.

```bash
npm ci                     # or: npm install
npx playwright install --with-deps chromium
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
npm test
```

`.env` is required. Without `ADMIN_USER` and `ADMIN_PASS` every test that needs an
admin session fails immediately with
`ADMIN_USER and ADMIN_PASS must be set — copy .env.example to .env`, rather than
silently falling back to a hard-coded credential. `.env.example` already holds the
public demo credentials of the restful-booker-platform project, so copying it is
enough.

### Other commands

```bash
npm test                       # everything
npm run test:public            # tests/public   — catalogue and navigation
npm run test:booking           # tests/booking  — availability, pricing, reservations
npm run test:contact           # tests/contact  — contact form
npm run test:admin             # tests/admin    — admin panel
npx playwright test --grep @unit    # the money parsers, no browser needed
npm run test:headed            # watch it run
npm run report                 # open the HTML report of the last run
npm run typecheck              # tsc --noEmit
```

### Configuration

| Variable | Default | What it does |
| --- | --- | --- |
| `BASE_URL` | `https://automationintesting.online` | System under test |
| `ADMIN_USER` | *(required)* | Admin panel username |
| `ADMIN_PASS` | *(required)* | Admin panel password |
| `WORKERS` | `4` | Parallel workers. See STRATEGY.md for the measurement behind 4. |

```bash
WORKERS=1 npx playwright test          # serial, for debugging
BASE_URL=http://localhost:8080 npm test
```

---

## Layout

```
src/
  core/         BasePage, BaseComponent
  components/   SiteNav, RoomCard, PriceSummary, AdminNav
  pages/        HomePage, ReservationPage, AdminLoginPage,
                AdminRoomsPage, AdminRoomDetailPage, AdminMessagesPage
  flows/        BookingFlow, ContactFlow, AdminSessionFlow
  fixtures/     test.ts — dependency injection and the teardown janitor
  data/         types.ts, factories.ts (@faker-js/faker)
  support/      api.ts (REST client + stay allocator), money.ts, dates.ts,
                catalogue.ts
tests/
  public/  booking/  contact/  admin/  unit/
```

---

## Case coverage

| Case | File | Test title |
| --- | --- | --- |
| TC01 | `tests/public/catalog.spec.ts` | TC01 — the home page lists every published room with the type and price the API reports |
| TC02 | `tests/public/catalog.spec.ts` | TC02 — every header link scrolls its section into view |
| TC03 | `tests/public/catalog.spec.ts` | TC03 — the room detail shows the description, features and policies of that room |
| TC04 | `tests/public/catalog.spec.ts` | TC04 — "Similar Rooms" offers the rest of the catalogue and never the current room |
| TC05 | `tests/public/catalog.spec.ts` | TC05 — the location panel and the footer show the branding contact details |
| TC06 | `tests/booking/pricing.spec.ts` | TC06 — Check Availability carries the chosen dates through to the reservation |
| TC07 | `tests/booking/pricing.spec.ts` | TC07 — the price summary computes nights, fees and total |
| TC08 | `tests/booking/pricing.spec.ts` | TC08 — changing the number of nights rescales the subtotal but not the fixed fees |
| TC09 | `tests/booking/reserve.spec.ts` | TC09 + TC14 — a valid reservation is confirmed on screen and stored in the backend |
| TC10 | `tests/booking/reserve.spec.ts` | TC10 — submitting an empty reservation form reports every field and creates nothing |
| TC11 | `tests/booking/reserve.spec.ts` | TC11 — a phone of 10 characters (one under the minimum) is rejected |
| TC11 | `tests/booking/reserve.spec.ts` | TC11 — a phone of 22 characters (one over the maximum) is rejected |
| TC11 | `tests/booking/reserve.spec.ts` | TC11 — a phone of 11 characters (the minimum) is accepted |
| TC11 | `tests/booking/reserve.spec.ts` | TC11 — a phone of 21 characters (the maximum) is accepted |
| TC12 | `tests/booking/reserve.spec.ts` | TC12 — a malformed email is rejected and no booking is created |
| TC13 | `tests/booking/reserve.spec.ts` | TC13 — Cancel discards the reservation form and creates nothing |
| TC14 | `tests/booking/reserve.spec.ts` | TC09 + TC14 — a valid reservation is confirmed on screen and stored in the backend |
| TC15 | `tests/contact/contact.spec.ts` | TC15 + TC18 — a valid message is acknowledged, counted and stored verbatim |
| TC16 | `tests/contact/contact.spec.ts` | TC16 — an empty contact form reports every required field and sends nothing |
| TC17 | `tests/contact/contact.spec.ts` | TC17 — a subject below its minimum length is rejected |
| TC17 | `tests/contact/contact.spec.ts` | TC17 — a message below its minimum length is rejected |
| TC18 | `tests/contact/contact.spec.ts` | TC15 + TC18 — a valid message is acknowledged, counted and stored verbatim |
| TC19 | `tests/admin/auth.spec.ts` | TC19 — valid credentials open the admin panel |
| TC20 | `tests/admin/auth.spec.ts` | TC20 — invalid credentials are refused and leave the user on the login form |
| TC21 | `tests/admin/auth.spec.ts` | TC21 — logging out ends the session, and the panel asks for credentials again |
| TC22 | `tests/admin/auth.spec.ts` | TC22 — every admin route redirects to the login form without a session |
| TC23 | `tests/admin/rooms.spec.ts` | TC23 — a created room appears in the admin listing, the API and its public page |
| TC24 | `tests/admin/rooms.spec.ts` | TC24 — editing a room updates the listing, the detail and the public price summary |
| TC25 | `tests/admin/rooms.spec.ts` | TC25 — a deleted room disappears from the listing, the catalogue and its own URL |
| TC26 | `tests/admin/rooms.spec.ts` | TC26 — creating a room with no number and no price is rejected |
| TC26 | `tests/admin/rooms.spec.ts` | TC26 — creating a room with no price is rejected |
| TC26 | `tests/admin/rooms.spec.ts` | TC26 — creating a room with no number is rejected |
| TC26 | `tests/admin/rooms.spec.ts` | TC26 — creating a room with a price below the minimum is rejected |
| TC27 | `tests/admin/inbox.spec.ts` | TC27 — a booking made on the public site is listed against its room in the panel |
| TC28 | `tests/admin/inbox.spec.ts` | TC28 — a contact message reaches the inbox, opens in full and is then marked read |
| —    | `tests/unit/money.spec.ts` | Money parsing @unit — four cases guarding the price parsers |

TC09/TC14 and TC15/TC18 are each one test: the second case of each pair is the
first plus a backend read, and running the expensive half twice on a shared site
would write double the data to prove nothing extra. See `STRATEGY.md`.

---

## What the suite writes to the shared site

This is a public demo that anyone can use, so the suite is careful about it:

- the three seed rooms (101, 102, 103) and other people's messages and bookings
  are **never** modified or deleted;
- every room, booking and message it creates carries a `Qa`/`9…` prefix and a tag
  unique per worker and per millisecond;
- everything is removed at teardown through the API — including the inbox message
  the backend silently writes for each booking (defect D12);
- booking dates are searched for, not computed, so two runs never collide.

After four consecutive full runs the site held exactly its seed data plus what
other users had left.
