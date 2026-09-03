import { test, expect } from '../../src/fixtures/test';
import { buildGuest } from '../../src/data/factories';
import { addDays, stayOf, toIso } from '../../src/support/dates';

/**
 * The public reservation form.
 *
 * Every case that actually creates a booking takes its dates from `bookableStay`,
 * which asks the API which windows the room already holds and returns one it does
 * not. That is not belt-and-braces: a clashing stay is answered with HTTP 409 and
 * the page renders nothing at all (defect D1), so a collision does not fail — it
 * hangs until an assertion times out, which is exactly the flake this suite must
 * not have.
 */
test.describe('Reservations @booking', () => {
  /**
   * TC09 and TC14 are one action verified at two levels: TC09 reads the banner,
   * TC14 reads the record behind it. Booking twice on a shared site to assert
   * them separately would double the data written and prove nothing extra, so
   * they share a booking. TC27 keeps its own because it needs an admin session
   * and a different page.
   */
  test('TC09 + TC14 — a valid reservation is confirmed on screen and stored in the backend', async ({
    bookingFlow,
    reservationPage,
    adminApi,
    workerRoom,
    bookableStay,
    janitor,
    page,
  }) => {
    const stay = await bookableStay(3);
    const guest = buildGuest();

    const bookingId = await bookingFlow.book(workerRoom.roomid, stay, guest);
    janitor.booking(bookingId, guest);

    // TC09: the panel, with the exact range that was requested.
    await reservationPage.expectConfirmedFor(stay);

    // TC14: the record the panel is claiming to be about.
    const bookings = await adminApi.listBookings(workerRoom.roomid);
    const created = bookings.find((booking) => booking.bookingid === bookingId);
    expect(created, `booking ${bookingId} is missing from GET /api/booking?roomid=${workerRoom.roomid}`).toBeDefined();

    expect(created!.firstname, 'stored first name').toBe(guest.firstname);
    expect(created!.lastname, 'stored last name').toBe(guest.lastname);
    expect(created!.roomid, 'stored room').toBe(workerRoom.roomid);
    expect(created!.bookingdates.checkin, 'stored check-in').toBe(stay.checkin);
    expect(created!.bookingdates.checkout, 'stored check-out').toBe(stay.checkout);

    await reservationPage.returnHomeLink.click();
    await expect(page).toHaveURL('/');
  });

  test('TC10 — submitting an empty reservation form reports every field and creates nothing', async ({
    bookingFlow,
    reservationPage,
    adminApi,
    workerRoom,
  }) => {
    // Nothing is submitted, so the stay never has to be free.
    const stay = stayOf(addDays(toIso(new Date()), 340), 2);

    await bookingFlow.startBooking(workerRoom.roomid, stay);
    const result = await bookingFlow.confirm();

    expect(result.status, 'POST /api/booking rejects an empty form').toBe(400);

    // The backend returns the same "must not be empty" twice (once per empty
    // date), so the set is compared, not the raw list.
    const shown = new Set(await reservationPage.validationErrors.allInnerTexts());
    for (const expected of [
      'Firstname should not be blank',
      'Lastname should not be blank',
      'size must be between 3 and 18',
      'size must be between 3 and 30',
      'size must be between 11 and 21',
      'must not be empty',
    ]) {
      expect(shown, `validation message "${expected}"`).toContain(expected);
    }

    // "Nothing was created" is proved by looking for a booking with no name on
    // it. Comparing the room's whole booking list before and after looked
    // stronger and was in fact wrong: at six workers it failed because another
    // worker's teardown deleted *its* booking on the same room in between.
    const nameless = (await adminApi.listBookings(workerRoom.roomid)).filter(
      (booking) => booking.firstname.trim() === '' || booking.lastname.trim() === '',
    );
    expect(nameless, 'an empty form must not have produced a booking').toEqual([]);
  });

  /**
   * TC11 splits along its own cost line, not along its data. The two rejected
   * lengths need no free window and leave nothing behind; the two accepted ones
   * each consume a real window and a teardown. Parameterising all four together
   * would make the cheap half pay for the expensive half's allocation.
   */
  for (const { label, phone } of [
    { label: '10 characters (one under the minimum)', phone: '0123456789' },
    { label: '22 characters (one over the maximum)', phone: '0123456789012345678901' },
  ]) {
    test(`TC11 — a phone of ${label} is rejected`, async ({
      bookingFlow,
      reservationPage,
      workerRoom,
    }) => {
      const stay = stayOf(addDays(toIso(new Date()), 350), 2);
      const guest = buildGuest({ phone });
      expect(guest.phone.length, 'the fixture really is the length under test').toBe(phone.length);

      await bookingFlow.startBooking(workerRoom.roomid, stay);
      await reservationPage.fillGuestForm(guest);
      const result = await bookingFlow.confirm();

      expect(result.status, 'POST /api/booking rejects the phone length').toBe(400);
      await expect(reservationPage.validationErrors).toHaveText(['size must be between 11 and 21']);
      await expect(reservationPage.confirmationPanel).toHaveCount(0);
    });
  }

  for (const { label, phone } of [
    { label: '11 characters (the minimum)', phone: '01234567890' },
    { label: '21 characters (the maximum)', phone: '012345678901234567890' },
  ]) {
    test(`TC11 — a phone of ${label} is accepted`, async ({
      bookingFlow,
      reservationPage,
      workerRoom,
      bookableStay,
      janitor,
    }) => {
      const stay = await bookableStay(2);
      const guest = buildGuest({ phone });
      expect(guest.phone.length, 'the fixture really is the length under test').toBe(phone.length);

      janitor.booking(await bookingFlow.book(workerRoom.roomid, stay, guest), guest);
      await reservationPage.expectConfirmedFor(stay);
    });
  }

  test('TC12 — a malformed email is rejected and no booking is created', async ({
    bookingFlow,
    reservationPage,
    adminApi,
    workerRoom,
  }) => {
    const stay = stayOf(addDays(toIso(new Date()), 360), 2);
    const guest = buildGuest({ email: 'not-an-email' });

    await bookingFlow.startBooking(workerRoom.roomid, stay);
    await reservationPage.fillGuestForm(guest);
    const result = await bookingFlow.confirm();

    expect(result.status, 'POST /api/booking rejects the address').toBe(400);
    await expect(reservationPage.validationErrors).toHaveText(['must be a well-formed email address']);
    await expect(reservationPage.confirmationPanel).toHaveCount(0);

    // This guest's surname is unique to this test, so its absence is proof that
    // nothing was stored, and it is unaffected by what other workers do.
    const mine = (await adminApi.listBookings(workerRoom.roomid)).filter(
      (booking) => booking.lastname === guest.lastname,
    );
    expect(mine, 'no booking was created for this guest').toEqual([]);
  });

  test('TC13 — Cancel discards the reservation form and creates nothing', async ({
    bookingFlow,
    reservationPage,
    adminApi,
    workerRoom,
  }) => {
    const stay = stayOf(addDays(toIso(new Date()), 370), 2);
    const guest = buildGuest();

    await bookingFlow.startBooking(workerRoom.roomid, stay);
    await reservationPage.fillGuestForm({ firstname: guest.firstname, email: guest.email });

    await reservationPage.cancelButton.click();

    // Back to the pre-form state: the call to action returns and the fields go.
    await expect(reservationPage.openFormButton).toBeVisible();
    await expect(reservationPage.firstnameInput).toHaveCount(0);
    await expect(reservationPage.cancelButton).toHaveCount(0);

    // Re-opening must not resurrect what was typed.
    await reservationPage.openGuestForm();
    await expect(reservationPage.firstnameInput).toHaveValue('');
    await expect(reservationPage.emailInput).toHaveValue('');

    const mine = (await adminApi.listBookings(workerRoom.roomid)).filter(
      (booking) => booking.firstname === guest.firstname,
    );
    expect(mine, 'cancelling must not have created a booking').toEqual([]);
  });
});
