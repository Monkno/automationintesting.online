# Test Cases: automationintesting.online (Restful Booker Platform v2.2)

Unlike `automationexercise.com`, this site does not publish an official test case list. The cases below were derived by exploring the live application on September 3, 2026: navigating the public site, inspecting the DOM, triggering actual backend validations and querying the public API (`/api/room`, `/api/branding`, `/api/message/count`).

Each case has a `TC##` identifier that maps to its automated test.

## Verification legend

- ✅ Observed: the behavior was manually confirmed during exploration.
- 🔍 To confirm: expected behavior behind the admin login, to be checked during automation. If the application differs, adjust the case to document the observed behavior and record the difference in `STRATEGY.md`.
- 🔧 Adjusted after automation: the application behaved differently from the original case. The text below records the behavior observed at that time; the discrepancy is documented in `STRATEGY.md` under its `D##` identifier.

Status after automation on September 3, 2026: all 28 cases were automated and passing. Eleven were adjusted because the application behaved differently from the original description: TC02, TC03, TC14, TC16, TC17, TC18, TC21, TC23, TC25, TC26 and TC28. Two pairs share a test because one case is a strict subset of the other (TC09+TC14 and TC15+TC18); see the redundancy section in `STRATEGY.md`.

These statuses and findings are historical evidence, not results from a current execution. The adjustments describe observed behavior; they do not establish that a documented defect is the correct business behavior.

## A. Public site: catalogue and navigation

### TC01: The home page lists rooms with their type and price ✅

1. Open `https://automationintesting.online/`.
2. Go to the *Our Rooms* section.

Expected: published rooms are listed. At exploration time: Single £100/night, Double £150/night, Suite £225/night. Each card shows the type, description, amenities (TV / WiFi / Radio / Safe) and a *Book now* button. Rooms and prices must match `GET /api/room`, the source of truth, rather than hard-coded test constants.

### TC02: Header navigation anchors to each section 🔧

1. From the home page, use the *Rooms*, *Booking*, *Location* and *Contact* links.

Expected: each link reaches its section (`#rooms`, `#booking`, `#location`, `#contact`), which appears in the viewport. Use `toBeInViewport`, not `toBeVisible`: all five sections are in the DOM from the start, so visibility alone would not prove that scrolling happened.

Adjustment (D2): the *Amenities* link exists in the header and points to `/#amenities`, but no section with that ID exists. The case no longer expects *Amenities* to scroll to a section. Instead, it explicitly asserts the current state (the link exists, the destination does not), so fixing the bug breaks the test and triggers a case review.

### TC03: Room details show the description, features and policies 🔧

1. Click a room's *Book now* link on the home page.
2. The page opens `/reservation/{roomid}?checkin=…&checkout=…`.

Expected: the page shows the room type, an *Accessible* badge when applicable, maximum guest capacity, description, *Room Features*, check-in and check-out policies, house rules and a nightly price consistent with the home page. Compare the description and features with `GET /api/room`, not literal values.

Adjustment (D8): the original case used check-in 15:00 to 20:00 and check-out 11:00. The application renders the 12-hour format: `Check-in: 3:00 PM - 8:00 PM` and `Check-out: By 11:00 AM`. Assert those strings.

### TC04: Similar Rooms excludes the current room and offers the others ✅

1. Open a room's detail page.
2. Go to *Similar Rooms You Might Like*.

Expected: other catalogue rooms are offered, never the current room, each with its correct price. *View Details* navigates to the selected room's detail page.

### TC05: The footer displays the business contact details ✅

1. Open the home page and scroll to the footer.

Expected: the address, phone and email match `GET /api/branding` (address "Shady Meadows B&B, Shadows valley, Newingtonfordburyshire, Dilbery, N1 1AA", phone `012345678901`, email `fake@fakeemail.com`).

## B. Availability and booking

### TC06: Check Availability carries the selected dates into the booking ✅

1. On the home page, choose future check-in and check-out dates in *Check Availability & Book Your Stay*.
2. Click *Check Availability*.
3. Click *Book now* on a room in the results.

Expected: the selected dates appear in the detail URL (`?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`) and in the price summary.

### TC07: The price summary calculates nights, fees and total ✅

1. Open `/reservation/1?checkin=2026-10-05&checkout=2026-10-08` (3 nights at £100/night in the historical example).

Expected: *Price Summary* shows `£100 x 3 nights = £300`, `Cleaning fee £25`, `Service fee £15` and Total £340. Verify the arithmetic `(price × nights) + 25 + 15` using the room's actual price, rather than asserting the literal `£340`.

### TC08: The total is recalculated when the number of nights changes ✅

1. Open a room's detail page with an N-night range.
2. Repeat with an M-night range (M ≠ N) for the same room.

Expected: the nightly subtotal changes proportionally. The fixed fees (£25 cleaning and £15 service) do not change, and the total reflects the new calculation.

### TC09: A booking succeeds with valid data ✅

1. Open a room's detail page with future dates.
2. Click *Reserve Now*.
3. Complete Firstname, Lastname, Email and Phone with valid data (phone length of 11 to 21 characters).
4. Click *Reserve Now* to confirm.

Expected: the *Booking Confirmed* panel appears with "Your booking has been confirmed for the following dates:" and the exact booked range `YYYY-MM-DD - YYYY-MM-DD`. *Return home* is available.

Automation note: TC09 and TC14 run as one test (`TC09 + TC14`). TC14 is TC09 plus an API read of the same booking. Creating two bookings to separate them would write twice the data to the shared site without proving anything extra.

### TC10: An empty booking form shows all validation errors ✅

1. Open a room's detail page and click *Reserve Now*.
2. Without completing any fields, click *Reserve Now* to confirm.

Expected: the error block includes at least `Firstname should not be blank`, `Lastname should not be blank`, `size must be between 11 and 21` (phone), `size must be between 3 and 30`, `size must be between 3 and 18` and `must not be empty`. No booking is created.

### TC11: Phone length validation ✅

1. Start a booking with a valid first name, last name and email.
2. Enter a 10-character phone number (below the minimum) and confirm.
3. Repeat with 22 characters (above the maximum).

Expected: both attempts show `size must be between 11 and 21` and create no booking. Phone numbers with 11 and 21 characters are accepted, checking both boundaries.

### TC12: Email format validation 🔍

1. Start a booking with all other fields valid.
2. Enter an email without `@` or without a domain and confirm.

Expected: the booking is rejected with an email validation message (`must be a well-formed email address`), and no booking is created.

### TC13: Cancel discards the booking form ✅

1. Open a room's detail page and click *Reserve Now*.
2. Partially complete the form.
3. Click *Cancel*.

Expected: the form closes, the previous state returns with *Reserve Now* available, and no booking is created.

### TC14: A booking created through the UI is visible through the API 🔧

1. Create a booking through the UI (TC09) with a unique, traceable name.
2. Query the booking through the authenticated admin API (`GET /api/booking?roomid=…`).

Expected: a booking exists with that exact `roomid`, first name, last name and date range. This closes the UI-to-backend check for TC09, which on its own only checks a confirmation banner.

Adjustment: neither `GET /api/booking?roomid=N` nor `GET /api/booking/{id}` returns email or phone. The payload is `{bookingid, roomid, firstname, lastname, depositpaid, bookingdates}`. The case no longer expects to verify those two fields through the API. The last name includes a tag unique per worker and millisecond, identifying the booking unambiguously.

Adjustment (D12): creating a booking also causes the backend to write an admin inbox message ("You have a new booking!") under the guest's name. The UI does not document this side effect. Suite teardown deletes it alongside the booking.

## C. Contact form

### TC15: A valid contact message is sent successfully ✅

1. On the home page, go to *Send Us a Message*.
2. Complete Name, Email, Phone, Subject and Message with valid data.
3. Click *Submit*.

Expected: the confirmation displays the sender's name and subject. The fields use `data-testid`: `ContactName`, `ContactEmail`, `ContactPhone`, `ContactSubject`, `ContactDescription`.

### TC16: An empty contact form shows validation errors 🔧

1. Submit the contact form without completing any fields.

Expected: `POST /api/message` returns 400 and displays exactly these eight errors. The backend's order is not stable, so compare them as a set:

```text
Name may not be blank
Email may not be blank
Phone may not be blank
Phone must be between 11 and 21 characters.
Subject may not be blank
Subject must be between 5 and 100 characters.
Message may not be blank
Message must be between 20 and 2000 characters.
```

Adjustment: the original case expected the message count not to increase. `/api/message/count` is global and shared with every demo visitor, so it cannot support that exact assertion. The 400 from `POST /api/message` proves that the submission was rejected, and is what the test asserts.

### TC17: Contact form length validation 🔧

1. Submit the form with a subject below the minimum length (< 5 characters).
2. Submit the form with a message below the minimum length (< 20 characters).

Expected: each case shows only its own length error, and `POST /api/message` returns 400.

Adjustment: the actual strings are custom backend messages, not the raw Bean Validation messages assumed in the original case:

| Field | Original expected message | Actual application message |
| --- | --- | --- |
| Subject | `size must be between 5 and 100` | `Subject must be between 5 and 100 characters.` |
| Message | `size must be between 20 and 2000` | `Message must be between 20 and 2000 characters.` |

The booking form does return raw messages such as `size must be between 3 and 18`. The two forms do not share a validation layer.

### TC18: Sending a message increases the message count 🔧

1. Read `GET /api/message/count`.
2. Send a valid UI message (TC15).
3. Read the count again.

Expected: the message appears as unread in `GET /api/message`, and `GET /api/message/count` matches the number of unread messages listed by `GET /api/message`. This closes the UI-to-backend check for TC15.

Adjustment: a count increase of exactly one cannot be asserted on this site. The counter is global, and the suite also changes it in parallel: each booking made by another worker writes a message (D12), which its teardown deletes. The delta assertion failed in 2 of 4 full runs. The assertions that can be scoped correctly are that this message appears among the unread messages and that the count endpoint agrees with the list.

Automation note: TC15 and TC18 run as one test (`TC15 + TC18`). TC18 is TC15 plus an API read of the same message.

## D. Admin panel: authentication

The restful-booker-platform project's public demo credentials are provided through `.env` and are never hard-coded in test code.

### TC19: Admin login with valid credentials ✅ (form) / 🔍 (destination)

1. Open `/admin`.
2. Complete `#username` and `#password`, then click `#doLogin`.

Expected: the admin panel opens, and its header shows admin navigation and the *Logout* option.

### TC20: Admin login with invalid credentials 🔍

1. Open `/admin` and try to sign in with an incorrect password.

Expected: an authentication error appears, the panel remains inaccessible, and the URL stays on the login page.

### TC21: Logout ends the admin session 🔧

1. While signed in, click *Logout*.

Expected: the session ends, the browser's `token` cookie is deleted, and navigating directly to `/admin/rooms` requires login again.

Adjustment (D4): the original case expected a return to the login form. The application redirects to the public home page (`/`), not `/admin`. Assert that destination.

Observation (D5): the admin header renders *Logout* on the login page even without a session. Check the panel's section links (Rooms / Report / Branding / Messages) and the cookie to establish a session, rather than the visibility of *Logout*.

### TC22: Admin routes are protected without a session 🔍

1. Without a session, navigate directly to an internal panel route (rooms / report / messages).

Expected: the application redirects to login instead of exposing the content.

## E. Admin panel: rooms

### TC23: Create a room 🔧

1. Sign in as admin and open room management.
2. Create a room with a number, type, accessibility value, price and features.

Expected: the room appears in the admin list with exactly the submitted data, in `GET /api/room` with the same values, and on its own reachable public page `/reservation/{roomid}` with the correct title, nightly price and *Price Summary* arithmetic.

Adjustment (D11): the original case also expected the room on the public home page. The *Our Rooms* grid never displays more than three rooms, regardless of the catalogue size. Exploration confirmed that the browser received six rooms from `GET /api/room` while the grid still rendered three. *Similar Rooms* has the same limit. The created room is not advertised on the home page; the case asserts that observed behavior and verifies publication through its direct URL.

### TC24: Edit a room 🔍

1. Open a room created by the test, never a seed room.
2. Change its price and features, then save.

Expected: `PUT /api/room/{id}` returns 202. The list and detail show the new values, while the type and accessibility remain unchanged (read them before editing and compare afterward). The public *Price Summary* uses the new price.

Observation (D13): the edit form renders *Update* before loading the room into its fields, and `PUT /api/room/{id}` sends every field. Editing the price while the form is still empty sends `roomName` and `type` as `null`, and the backend returns 400 (`Room name must be set`, `Type must be set`). The UI shows "Failed to update room", but its displayed values do not change, making a rejection easy to mistake for an action that did nothing. The suite waits for the populated form and verifies the PUT's 202 rather than inferring success from a displayed value.

### TC25: Delete a room 🔧

1. Delete a room created by the test.

Expected: it disappears from the admin list and `GET /api/room`, is no longer retrievable by `roomid`, and `/reservation/{roomid}` no longer renders *Book This Room*.

Adjustment (D9): a deleted room's `GET /api/room/{id}` returns 500, not 404. `/reservation/{id}` renders the Next.js error boundary ("This page couldn't load") rather than a 404 page. The case asserts that the room cannot be retrieved (`>= 400`) instead of a specific code, documenting the behavior without treating 500 as correct.

### TC26: Validation when creating an incomplete room 🔧

1. Try to create a room without a number and/or price.

Expected: `POST /api/room` returns 400, an appropriate message appears, and no room with that number remains.

Adjustment (D10): there are no per-field validation errors. A single message varies according to the missing input:

| Input | Displayed message |
| --- | --- |
| No number and no price | `Failed to create room` |
| Number provided, no price | `Failed to create room` |
| No number, price provided | `Room name must be set` |
| Negative price | `must be greater than or equal to 1` |

Omitting the name gives a useful message; omitting the price gives an opaque one that does not identify the missing field.

Adjustment: an unchanged list size cannot be asserted while the suite runs in parallel, since another worker can legitimately create or delete a room at that moment. Verify that no room exists with the attempted draft's number, scoping the check to the test's own data.

## F. Admin panel: bookings and messages

### TC27: A UI booking appears in the admin panel 🔍

1. Create a booking through the public site (TC09) with traceable data.
2. Open that room's bookings section in the admin panel.

Expected: the booking lists the guest's first name, last name and exact dates.

### TC28: A contact message appears in the inbox and is marked as read 🔧

1. Send a contact message with a unique subject (TC15).
2. Open the admin messages section.
3. Open the message.

Expected: the list shows the message's subject and sender with `read-false` state. Opening it shows the full name, email, phone, subject and body. After closing it, the row changes to `read-true`, and `GET /api/message` reports it as read.

Adjustment: the unread count cannot be expected to decrease by exactly one. In a run with 4 workers, it decreased by two because another worker's teardown deleted a booking notification (D12) at the same time. The badge assertion now checks UI/API consistency: its number matches the unread message count returned by `GET /api/message`, checked before and after opening the message.

Note: inbox rows use indexed `data-testid` values (`message0`, `message1`, …) that shift when someone else uses the shared inbox. The suite locates its row by the unique subject, never by index.

## Coverage deliberately out of scope

These are explicit scope decisions, not omissions. `STRATEGY.md` describes the details and proposed order of work.

- Security: login brute force, token expiry or tampering, IDOR on `roomid`/`bookingid`, and stored XSS through the contact form.
- Availability business rules: duplicate bookings, partial overlaps, check-out before check-in and stays in the past.
- Accessibility: keyboard navigation, form labels and contrast.
- Cross-browser and responsive behavior: the suite runs in Chromium; the mobile `navbar-toggler` layout is not covered.
- Admin branding and configuration: editing the logo, description and contact details.
