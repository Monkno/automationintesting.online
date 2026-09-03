# Strategy — automationintesting.online E2E suite

Written after building and running the suite, not before. Every number in it was
measured against the live site on 2026-09-03.

---

## 1. How the DOM was learned

Nothing here was guessed. The site is a client-rendered Next.js SPA: `curl` on
`/` returns 10 KB of script tags and a spinner, so static scraping is useless.

Recon was done with throwaway Playwright specs that navigated, waited for
`networkidle`, and wrote `await page.content()` to disk — one pass for the public
site, one for the admin panel behind login, and further passes to answer specific
questions (what does an over-booked date do? what does the edit form post?). The
dumps were read, the selectors taken from them, and the recon directory deleted.

That is where the useful selectors came from, and they are better than what one
would have guessed:

| Guess | What is actually there |
| --- | --- |
| placeholder `Firstname` | `input.room-firstname` |
| a form `submit` | `button#doReservation`, replaced by an unnamed one |
| `#checkin` | nothing — the label points at an input with no `id` (D3) |
| `#createRoom` row ids | `span.roomDelete[id="4"]` — a bare number, invalid as `#4` |

Recon also produced the four highest-value findings in this document — D1, D11,
D12 and D13 — none of which is visible from reading the UI.

---

## 2. Architecture

Four layers, each with one reason to exist.

```
tests/          what is verified, one test per case, named for the case id
src/flows/      business sequences that cross pages or need the network
src/pages/      one page's controls and assertions
src/components/ fragments that repeat across pages
```

`BasePage` gives every page `open()` and `expectLoaded()` from just a `path` and a
`uniqueMarker()`, plus an HTTP-status guard so a bad gateway reads as
`GET /admin/rooms returned HTTP 502` instead of a locator timeout thirty seconds
later. `BaseComponent` scopes every child locator to a root.

**Deliberately absent.** The sibling suite for automationexercise.com carries a
`networkGuard` (AdSense blocking) and a `waitForScripts` helper (jQuery handlers
bound at the end of the document). Neither is needed here and neither was copied:
this site loads no third-party ads or analytics, and React attaches its handlers
in the same commit that renders the element, so Playwright's auto-waiting on the
marker is both necessary and sufficient. Copying them would have been cargo cult.

### What the components earn

| Component | Used by | Why it exists |
| --- | --- | --- |
| `SiteNav` | home, every `/reservation/*` | same header on two page objects |
| `RoomCard` | TC01, TC06, TC23 | one tile read as data, three tests compare it to the API |
| `PriceSummary` | TC06, TC07, TC08, TC23, TC24 | the arithmetic assertion, written once |
| `AdminNav` | TC19, TC21, TC22, TC28 | "signed in" and the unread badge, defined once |

`PriceSummary.expectConsistentWith(rate, nights)` is the single most reused
assertion in the suite: every figure on the card must be derivable from the room's
own API price and the number of nights in the URL. No test contains `340`.

### What the flows earn

| Flow | Used by | The thing it owns |
| --- | --- | --- |
| `BookingFlow` | TC09–TC14, TC27 | submits the form **while watching `POST /api/booking`**, and returns the status and the new booking id |
| `ContactFlow` | TC15–TC18, TC28 | same, for `POST /api/message` |
| `AdminSessionFlow` | TC19–TC28 | two entry points into one session |

The booking flow's reason to exist is not "click three things". It is that the UI
does not tell you what happened. A clashing date range is answered 409 and renders
**nothing at all** (D1); a rejected booking renders errors but no id; a successful
one renders a banner but no id either. Without the id there is nothing to delete
at teardown, and an undeleted booking blocks those dates for every future run. So
the flow reads the id out of the response.

### Splitting where the cases diverge, not where the pages change

`AdminSessionFlow` has two entry points on purpose:

- `loginThroughForm()` — TC19, TC20 and TC21 are *about* the login form, so they
  drive it;
- `loginWithToken()` — TC23 through TC28 merely need to be signed in, and paying
  for a form round-trip in each of six tests buys nothing. They seed the `token`
  cookie the API handed them.

Both share one definition of "signed in" (`AdminNav.expectSignedIn`), so a change
to the panel breaks them in the same place. Seeding the cookie is possible only
because the cookie is not HttpOnly and has no CSRF pairing — recorded as D7.

---

## 3. Isolation on a shared site

The site is public. Anyone can be booking room 2 while the suite runs, and the
demo resets its own database on some schedule (observed mid-session: the seed
bookings reappeared and the suite's own rows vanished). Three rules follow.

**Never touch what the suite did not create.** Rooms 101/102/103 are never edited
or deleted; TC24, TC25 and TC26 each create their own room first. Other people's
messages and bookings are never deleted.

**Everything created is tagged and disposed.** `uniqueTag()` produces
`w{workerIndex}{epochMillis}{3 random digits}`, which goes into every guest
surname, contact subject and email. The `janitor` fixture takes registrations
during the test and removes them afterwards through the API. Teardown is
best-effort by design — TC25 deletes its own room, a failing test leaves whatever
it reached, and the demo may have reset underneath — so every removal is attempted
and none is asserted. Teardown must never turn a green test red, nor mask a red
one.

That teardown was wrong for two full days of runs, in a way worth recording:
deleting the booking left behind the inbox message the *backend* writes for every
booking (D12). Eleven of them had accumulated on the shared site before the
leftover check caught it. `janitor.booking(id, guest)` now sweeps both.

**Prove "nothing was created" with your own data, never with a count.** The first
version of TC10 compared the room's whole booking list before and after. It passed
at three workers and failed at six — not because of the application, but because
another worker's teardown deleted *its* booking on the same room in between. The
same mistake was in TC12, TC13, TC26 and TC18. All five now assert on something
that only this test could have produced:

| Case | What proves the negative |
| --- | --- |
| TC10 | `POST /api/booking` returned 400, and no booking on that room has a blank name |
| TC12, TC13 | no booking on that room carries this guest's unique surname |
| TC16, TC17 | `POST /api/message` returned 400 |
| TC26 | `POST /api/room` returned 400, and no room carries this draft's number |

### Booking dates — the flakiness this project was always going to have

This is the one that mattered. The application rejects a stay overlapping an
existing booking for the same room with HTTP 409 and **renders nothing**: no
error, no confirmation, the form just sits there (D1). A collision therefore does
not fail loudly — it hangs until an assertion times out, twenty seconds later,
with a message about a missing panel.

Two things had to be true at once, and one mechanism could not deliver both:

- **within a run**, parallel workers must not pick the same window;
- **across runs**, a second run must not collide with the first run's leftovers,
  which persist on a shared site and which a fixed formula would reproduce
  exactly.

`ApiClient.allocateStay(roomId, nights, workerIndex)` does both:

1. each worker starts from `today + 365 days + workerIndex × 500 days`, so the
   workers own disjoint slices of the calendar;
2. the window is not computed but **searched for** — the room's existing bookings
   are read back from the API and the first genuinely free window wins, with a
   one-night buffer either side because the server's treatment of back-to-back
   stays is undocumented;
3. when a window is blocked, the search jumps past the blocking booking rather
   than crawling a day at a time.

Because it reads the live state, it is correct on run two, on run twenty, and
after somebody else has booked in the same range. Workers are additionally spread
over different rooms (`rooms[workerIndex % rooms.length]`), which is a cheap
second line of defence, not the mechanism.

The cases that do **not** create a booking (TC04, TC07, TC08, TC10, TC12, TC13,
and two of the four TC11 variants) skip the allocator entirely and use any future
date. Making them pay for an API round-trip they do not need would be waste.

### The other shared-state race

TC01 and TC04 assert "the page shows the catalogue" while TC23–TC26 add and remove
rooms in another worker. Comparing against one API read makes those two flaky in
direct proportion to how well the room tests work.

`readAgainstCatalogue()` reads the catalogue either side of the page read and
asserts only on the rooms present in both. Rooms that appeared or vanished in
between belonged to another worker and are excluded — without weakening the
assertion for any room that actually stayed put. Both directions are still
asserted: no expected room is missing from the page, and no card on the page is
invented.

---

## 4. Reliability

**No fixed sleeps anywhere.** `grep -r waitForTimeout src tests` returns nothing.

**Three real races were found and each was fixed at its cause**, not papered over:

1. *The admin room detail view.* `.room-details` is in the DOM before the room has
   been fetched into it. Reading the type before an edit, to compare it after,
   returned `""`. `AdminRoomDetailPage.expectLoaded()` now means "the room is in
   it": the heading matches `/^Room: \S/` and the price is non-empty.

2. *The admin room edit form.* `#update` renders before the room is loaded into
   the form, and `PUT /api/room/{id}` sends every field. Editing the price against
   an unpopulated form posts `roomName: null` and the server answers 400. Nothing
   about that reads as a timing problem — the symptom is a price that simply did
   not change. `startEditing()` waits for the form to be *populated*, and
   `saveEdits()` returns the `PUT` status so a rejection reads as "the update was
   refused with 400", not as a stale value twenty seconds later. This is also
   defect D13: a real user clicking fast hits it too.

3. *The inbox read-state.* Closing the message modal does not repaint the row in
   the same tick. A one-shot `getAttribute('class')` returned `read-false` for a
   message that had just been read. Replaced with `toHaveClass`, which retries.

**Two assertions of mine were simply wrong, and the numbers say so.** Both were
about counters, and both are corrected in place rather than loosened:

- *"the unread badge decrements by one."* Measured at four workers: it dropped by
  **two**, because another worker's teardown removed a booking notification in the
  same instant. The badge is a global counter; the claim that holds is that it
  agrees with `GET /api/message` — a UI↔API consistency assertion, polled.
- *"the message count increases by at least one."* Failed in **2 of 4** full runs,
  for the same reason in reverse. Replaced with two exact claims: this message is
  among the unread ones, and `/api/message/count` equals the number of unread
  messages `/api/message` lists.

**Parallelism was measured, not assumed.** Same suite, retries disabled:

| Workers | Wall clock |
| --- | --- |
| 1 | 108 s |
| 3 | 38.5 s |
| 4 | **31–34 s** |
| 6 | 27.9 / 29.1 / 33.3 s |

The default is **4**. One to four is a 3.5× gain; four to six buys about a second,
which is inside the 5-second run-to-run variance, while putting 50 % more load on
a shared demo whose bottleneck is the server. Six workers also surfaced the TC10
cross-worker bug — which was worth finding, and is now fixed, but the extra
concurrency still buys nothing measurable.

**Retries: 1 locally, 2 on CI, with `trace: 'on-first-retry'`.** Retries absorb a
shared demo's noise without hiding defects, because every retry leaves a trace.
Everything reported below was run with `--retries=0`.

**Stability evidence.** Six consecutive full runs with retries disabled at the
default 4 workers: 36.3 s, 35.9 s, 37.8 s, 38.0 s, 34.4 s, 36.2 s — 37 passed each
time. Plus a seventh from a clean copy of the repository following only the README
(`npm ci`, `playwright install`, `cp .env.example .env`, `npm test`): 37 passed in
45 s. A single green run is not evidence; these are.

After all of them the shared site held exactly its seed rooms, its seed message,
and rows belonging to other users — nothing of this suite's.

---

## 5. Assertions

The rule applied throughout: verify the outcome, not the presence of an element.

- **Arithmetic the page computed.** `PriceSummary` parses every figure into a
  number and asserts `subtotal = rate × nights` and `total = subtotal + cleaning +
  service`, with the rate taken from `GET /api/room`. TC08 goes further and
  asserts the *relationship between two readings*: the subtotal scales with
  nights, the fees do not move, and the whole difference in the total is the extra
  nights.
- **Field by field against the data that created it.** TC23 compares six fields of
  the admin row and six of the API record against the draft. TC28 compares five
  fields of the opened message against what was typed. TC05 rebuilds the address
  from `GET /api/branding`'s structured parts rather than pasting the rendered
  string.
- **A value read before the action, asserted to survive it.** TC24 reads the type
  and accessibility before editing and asserts they are unchanged after — the edit
  form posts every field, so "unchanged" is a claim, not a given.
- **Scroll asserted with `toBeInViewport`, not `toBeVisible`.** All five sections
  of the single-page site are in the DOM from the start, so `toBeVisible` would
  pass without any navigation happening.
- **Empty collections guarded.** `readRoomCards` and `readSimilarRooms` both
  `expect(...first()).toBeVisible()` before counting, so a page that rendered
  nothing fails there instead of passing an empty per-item loop. TC04 asserts a
  non-empty `mustBeOffered` before iterating it. TC22 asserts
  `PROTECTED_ADMIN_ROUTES.length > 0` before looping.
- **The parsers are tested separately.** `tests/unit/money.spec.ts` exercises
  `parseGbp` and `parseNightlyLine` on strings copied verbatim from the running
  site. This exists because everywhere else *both sides* of a price comparison go
  through the parser, so a parser that dropped a digit would drop it twice and the
  assertion would still pass. `parseNightlyLine` deliberately does not reuse
  `parseGbp` for the same reason, and it throws on `"£340"` rather than reading it
  as "340 for 0 nights", which would make the total check trivially satisfiable.

---

## 6. Redundancy

Read all 28 cases first; they are fewer real flows than they look.

**Strict subsets — merged into one test each.**

- **TC09 ⊂ TC14.** TC14 is TC09 plus one API read on the same booking. Its own
  text says it "gives real value to TC09's assertion, which on its own only checks
  a banner". Booking twice on a shared site to report them separately would double
  the data written and prove nothing extra. One test, titled `TC09 + TC14`.
- **TC15 ⊂ TC18.** Identical relationship, one contact message. One test, titled
  `TC15 + TC18`.

**TC27 was *not* merged**, though it also needs a booking. It needs an admin
session and a different page object, and keeping it separate means a failure in
the admin listing does not report the public booking flow as broken. Two bookings
instead of three; the third would have bought nothing.

**Differ in one mechanism only — parameterised.**

- **TC11** is four data points over one flow. It is split into *two* parameterised
  loops, not one of four, and that split is on cost rather than on data: the
  rejected lengths (10, 22) need no free window and leave nothing behind, while
  the accepted ones (11, 21) each consume a real allocated window and a teardown.
  A single parameterised test declares every fixture in one signature, so the
  cheap half would have paid for the expensive half's allocation on every run.
- **TC17** is two data points and both are cheap — no fixture beyond the home page
  — so they *are* one parameterised test. Same shape, opposite decision, for the
  stated reason.
- **TC26** is four data points over one form, all cheap, so one parameterised test.

**Genuinely overlapping but kept apart.**

- **TC07 ⊂ TC08.** TC07 is the three-night case of TC08. They share the arithmetic
  through `PriceSummary.expectConsistentWith`, but TC07 keeps its own test because
  it pins the two fixed fees to their literal values (£25, £15) — which is the
  thing TC08 asserts only as "unchanged". Different claims, one implementation.
- **TC01 and TC03** both compare a room against the API, but from the grid and
  from the detail page. The overlap is one API read.

**Low-value cases, kept because the brief asked for them.** TC02 is a link-anchor
check that would be a smoke test in a real suite; its only real finding is D2.
TC05 is static branding data. Neither would survive a coverage-versus-cost review
of its own, and both run in under two seconds.

---

## 7. Coverage gaps, in the order I would close them

**Negative and validation paths beyond the form fields.** This is where the
defects actually are, and the published cases barely touch it. First:

1. **The silent 409 (D1).** No case covers "book dates that are already taken",
   which is the single worst behaviour on the site. It needs a test that books a
   range, then attempts to overlap it, and asserts the user is told something. It
   is *not* here because such a test asserts a bug, and a bug that will be fixed;
   it belongs in the defect report first. It is one method call away
   (`allocateStay` can be inverted to *find* a taken window).
2. **Check-out before check-in**, and stays entirely in the past. The URL is
   user-editable (`/reservation/1?checkin=2030-01-05&checkout=2029-01-01`), so
   this is reachable without any UI.
3. Upper bounds: a 30-character first name, a 2001-character message, a room price
   of `999999999`.

**State and concurrency.** Two browsers booking the same range simultaneously;
what happens to bookings held against a room that is then deleted (the room
deletes fine — the bookings' fate is untested).

**Authorization and injection.** IDOR on `/api/booking/{id}` and
`/api/room/{id}` with a token belonging to nobody; token tampering and expiry;
stored XSS through the contact form, which renders the message body straight into
the admin modal. `/api/report` is behind auth (401 without) and was not otherwise
probed.

**Boundaries in the price summary.** A one-night stay (does it say "1 night" or "1
nights"?) and a zero-night stay (`checkin == checkout`).

**Cross-browser, responsive and accessibility.** Chromium only. The site has a
mobile layout behind `.navbar-toggler` that nothing exercises. The accessibility
problems found incidentally (D3, D14) suggest an axe pass would be productive.

**Branding administration.** `/admin/branding` was reached (TC22) but its editing
is untested — and it is the one admin screen whose output the public site reads on
every page load.

---

## 8. Assumptions and trade-offs

- **The API is treated as the source of truth for data, and the UI as the thing
  under test.** Prices, room contents and branding are read from `/api/*` so no
  assertion hard-codes £100; a catalogue change breaks nothing.
- **The API is also used for setup and teardown**, which is faster and more
  reliable than driving the panel. It does mean an API that lies would let a UI
  bug through: mitigated by TC23–TC25 asserting the admin *screen* and the API
  agree, rather than trusting either alone.
- **The admin session is seeded as a cookie for TC23–TC28.** Faster, and it does
  not weaken those cases because TC19 tests the form itself. It relies on D7.
- **`ADMIN_USER`/`ADMIN_PASS` are required, not defaulted.** The suite fails at
  startup without a `.env` rather than quietly using a literal. The credentials
  are the project's public demo credentials, but the mechanism is the point.
- **Chromium only.** The cases describe behaviour, not rendering; a second engine
  would double the load on a shared demo for little signal. The project takes a
  second browser by adding one entry to `projects`.
- **4 workers, measured.** See §4.
- **`toHaveClass` and `expect.poll` where the state is genuinely eventual.** Both
  retry; neither sleeps.
- **The demo resets itself.** Nothing in the suite depends on data existing from a
  previous run — every test builds what it needs.

---

## 9. Defects and oddities found

Sixteen, in rough order of severity. Everything here was reproduced directly, not
inferred.

### D1 — A clashing booking fails completely silently (high)

`POST /api/booking` for a range that overlaps an existing booking on the same room
returns **409 `{"error":"Failed to create booking"}`**, and the page renders
**nothing**: no `.alert-danger`, no "Booking Confirmed", no change of any kind.
The guest fills in the form, clicks *Reserve Now*, and is given no reason to think
anything went wrong or right.

Reproduced: book room 1 for 2026-10-05→2026-10-08, then attempt
2026-10-06→2026-10-07. Alert count 0, confirmation count 0, response 409.

This is also the reason the whole date-allocation mechanism in §3 exists: a
collision does not fail a test, it hangs it.

### D11 — The public site never shows more than three rooms (high)

The home page's *Our Rooms* grid, and *Similar Rooms You Might Like*, both render
at most three rooms whatever the catalogue holds.

Reproduced: created three extra rooms, so `GET /api/room` returned six
(`[1,2,3,8,9,10]`) and the browser's own network log showed all six arriving. The
grid rendered three. Not a caching artefact — reloads and an availability search
made no difference; not a filter on type, image or accessibility — three different
variants were tried.

For a B&B with four rooms, the fourth is unadvertised and reachable only by typing
its URL.

### D13 — The room edit form can post nulls over a live room (high)

`/admin/room/{id}` renders the *Update* button before the room has been loaded
into the form, and `PUT /api/room/{id}` sends every field. Clicking *Update* after
changing one field on a not-yet-populated form sends `roomName: null`,
`type: null`, `roomPrice: null`; the server answers 400 with
`["must not be null", "Type must be set", "Room name must be set"]`, and the panel
shows "Failed to update room" while the *displayed* room is unchanged — which
reads much more like "nothing happened" than "your edit was rejected".

### D12 — Every booking silently writes an admin inbox message (medium)

Creating a booking causes the backend to post a message to the admin inbox:
subject `You have a new booking!`, sender = the guest's name, body = "You have a
new booking from X. They have booked a room for the following dates: … to …". It
counts toward the unread badge. Nothing in the UI says this will happen, and no
documentation mentions it. It is why the suite's teardown was leaking data and why
the message-count assertions in TC18 and TC28 had to be rewritten.

### D9 — A deleted room returns 500, and its page crashes (medium)

`GET /api/room/{id}` for a deleted room returns **500**, not 404.
`/reservation/{id}` for a deleted room returns HTTP 200 and renders the Next.js
error boundary — "This page couldn't load. Reload to try again, or go back." —
with no navigation, no header and no footer, rather than a 404 page.

### D10 — Room-create validation is inconsistent and sometimes opaque (medium)

| Input | Message |
| --- | --- |
| no number, no price | `Failed to create room` |
| number, no price | `Failed to create room` |
| no number, price | `Room name must be set` |
| number, price `-5` | `must be greater than or equal to 1` |

Omitting the **name** produces a message that names the field. Omitting the
**price** produces one that names nothing, so the user is told a room failed to be
created without being told why. There is no field-level highlighting either way.

### D2 — The Amenities nav link points at a section that does not exist (medium)

The header renders `<a href="/#amenities">Amenities</a>`, but no element with
`id="amenities"` exists anywhere on the page (`grep` over the rendered DOM: one
occurrence, and it is the href). Clicking it changes the URL and scrolls nowhere.

### D7 — The admin session cookie is not HttpOnly and has no CSRF pairing (medium, security)

`POST /api/auth/login` returns `{"token":"…"}`, which the client stores in a
`token` cookie with `httpOnly: false`, `secure: false`, `sameSite: Lax`. Any XSS
anywhere on the origin yields a full admin session, and the value alone is
sufficient — nothing else is checked. The suite uses this deliberately to seed
sessions (§2), which is convenient for testing and bad for production.

Related, untested: the contact form's message body is rendered into the admin
modal, which is exactly the shape of a stored-XSS path.

### D5 — The admin header shows a Logout button when nobody is logged in (low)

`/admin`, logged out, renders the *Logout* button in the header alongside *Front
Page*. It is why `AdminNav.expectSignedIn()` checks the section links and the
session cookie instead of the obvious control.

### D4 — Logging out lands on the public home page, not the login form (low)

Clicking *Logout* clears the `token` cookie and navigates to `/`, not to `/admin`.
The session really does end — a direct visit to `/admin/rooms` is bounced back to
the login form — so this is a UX oddity rather than a security issue.

### D6 — The same checkbox has two different ids on two forms (low)

The *Refreshments* feature checkbox is `#refreshCheckbox` on the room-create form
and `#refreshmentsCheckbox` on the room-edit form. Nothing else differs between
the two feature blocks.

### D3 — The availability datepickers have labels bound to nothing (low, accessibility)

`<label for="checkin">` and `<label for="checkout">` are rendered, but the inputs
they point at have no `id` at all — just `class="form-control"` inside a
react-datepicker wrapper. Clicking the label does nothing and a screen reader
announces an unlabelled text field. It is also why the suite has to address them
by position.

### D14 — Room images and guest capacity are hard-coded (low)

Every card in the home grid carries `alt="Single Room"`, including the Double and
the Suite. Every reservation page says "Max 2 Guests", and every *Similar Rooms*
card says "2 Guests", regardless of room type — the capacity does not appear in
`GET /api/room` at all, so it is a literal in the component.

### D16 — Rooms created through the admin form get an off-site default image (low)

The create form offers neither a description nor an image field, so new rooms get
`description: "Please enter a description for this room"` and
`image: "https://www.mwtestconsultancy.co.uk/img/room1.jpg"` — an absolute URL on
a **different domain** to the application. Existing rooms use relative
`/images/room1.jpg`.

### D15 — The footer's Quick Links are all dead (low)

*Home*, *Rooms*, *Booking* and *Contact* in the footer are all `href="#"`. The
breadcrumb's *Rooms* link on the reservation page is `href="#"` too.

### D8 — Room policies use 12-hour times (cosmetic, case adjusted)

`Check-in: 3:00 PM - 8:00 PM` and `Check-out: By 11:00 AM`, where TC03 had been
written against 15:00–20:00 and 11:00. Not a defect, just the case being wrong;
recorded because it changed an assertion.

### Environmental note — the demo resets its own database

Mid-session, `GET /api/booking?roomid=3` went from returning the suite's data to
returning seed bookings 3 and 5 (Timothy Barrow, John Doe) that had not been there
minutes earlier, and a room created through the API vanished. The reset is not on
any schedule the suite can see. Nothing in the suite depends on pre-existing data,
so it is harmless here — but it would silently invalidate any suite that seeded
fixtures once and reused them.

### Also observed, in the application's favour

The two forms do **not** share a validation layer, and it shows: the reservation
form surfaces raw Bean Validation messages (`size must be between 3 and 18`),
while the contact form surfaces hand-written ones
(`Subject must be between 5 and 100 characters.`). Neither is wrong; the
inconsistency is the finding, and it is why TC10's and TC16's expected texts look
so different from each other.
