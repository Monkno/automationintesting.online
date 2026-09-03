import { test, expect } from '../../src/fixtures/test';
import { addDays, nightsBetween, stayOf, toIso } from '../../src/support/dates';

/**
 * Availability and price arithmetic. None of these three cases creates a
 * booking, so they need no date allocation: any future window is safe.
 */
test.describe('Availability and pricing @booking', () => {
  test('TC06 — Check Availability carries the chosen dates through to the reservation', async ({
    homePage,
    reservationPage,
    rooms,
    page,
  }) => {
    const stay = stayOf(addDays(toIso(new Date()), 300), 4);

    await homePage.open();
    await homePage.searchAvailability(stay.checkin, stay.checkout);

    // Every "Book now" link must now carry the searched dates, not just the one
    // the test happens to click.
    const cards = await homePage.readRoomCards();
    expect(cards.length, 'availability search returned no rooms').toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.checkin, `room ${card.roomId} check-in in the Book now link`).toBe(stay.checkin);
      expect(card.checkout, `room ${card.roomId} check-out in the Book now link`).toBe(stay.checkout);
    }

    const chosen = cards[0];
    await homePage.roomCard(0).bookNowLink.click();
    await expect(page).toHaveURL(
      `/reservation/${chosen.roomId}?checkin=${stay.checkin}&checkout=${stay.checkout}`,
    );

    // …and the dates have to reach the money, not just the URL.
    const room = rooms.find((candidate) => candidate.roomid === chosen.roomId)!;
    await reservationPage.priceSummary.expectConsistentWith(room.roomPrice, stay.nights);
  });

  /**
   * TC07 is the 3-night case of TC08 and nothing more, so the arithmetic lives in
   * `PriceSummary.expectConsistentWith` and both cases call it. TC07 keeps its own
   * test because it also pins the two fixed fees, which is the part TC08 asserts
   * as "unchanged" rather than as a value.
   */
  test('TC07 — the price summary computes nights, fees and total', async ({ reservationPage, rooms }) => {
    const room = rooms[0];
    const stay = stayOf(addDays(toIso(new Date()), 310), 3);

    await reservationPage.openFor(room.roomid, stay);
    await reservationPage.priceSummary.expectConsistentWith(room.roomPrice, stay.nights);

    const breakdown = await reservationPage.priceSummary.read();
    expect(breakdown.cleaningFee, 'cleaning fee').toBe(25);
    expect(breakdown.serviceFee, 'service fee').toBe(15);
    expect(breakdown.total, 'total = rate x nights + 25 + 15').toBe(room.roomPrice * stay.nights + 40);
  });

  test('TC08 — changing the number of nights rescales the subtotal but not the fixed fees', async ({
    reservationPage,
    rooms,
  }) => {
    const room = rooms[0];
    const shortStay = stayOf(addDays(toIso(new Date()), 320), 2);
    const longStay = stayOf(addDays(toIso(new Date()), 330), 5);

    await reservationPage.openFor(room.roomid, shortStay);
    await reservationPage.priceSummary.expectConsistentWith(room.roomPrice, shortStay.nights);
    const short = await reservationPage.priceSummary.read();

    await reservationPage.openFor(room.roomid, longStay);
    await reservationPage.priceSummary.expectConsistentWith(room.roomPrice, longStay.nights);
    const long = await reservationPage.priceSummary.read();

    // The relationship between the two readings is the actual subject of the case.
    expect(long.nights, 'the second stay really is longer').toBeGreaterThan(short.nights);
    expect(nightsBetween(longStay.checkin, longStay.checkout)).toBe(long.nights);
    expect(long.nightsSubtotal / short.nightsSubtotal, 'subtotal scales with nights').toBeCloseTo(
      long.nights / short.nights,
      10,
    );
    expect(long.cleaningFee, 'cleaning fee is fixed').toBe(short.cleaningFee);
    expect(long.serviceFee, 'service fee is fixed').toBe(short.serviceFee);
    expect(long.total - short.total, 'the whole difference is the extra nights').toBe(
      long.nightsSubtotal - short.nightsSubtotal,
    );
  });
});
