import { test, expect } from '../../src/fixtures/test';
import { NAV_TARGETS, type NavSection } from '../../src/components/SiteNav';
import { addDays, stayOf, toIso } from '../../src/support/dates';
import { PUBLIC_ROOM_LIMIT, readAgainstCatalogue } from '../../src/support/catalogue';

test.describe('Public catalogue @public', () => {
  test('TC01 — the home page lists every published room with the type and price the API reports', async ({
    homePage,
    api,
  }) => {
    const { result: cards, stable, known } = await readAgainstCatalogue(api, async () => {
      await homePage.open();
      return homePage.readRoomCards();
    });

    // The API is the source of truth. Both directions are asserted: no room the
    // grid should advertise is missing, and no card on the page is invented.
    //
    // "should advertise" stops at PUBLIC_ROOM_LIMIT because the grid is capped
    // at three (defect D11) — asserting the whole catalogue here would fail for
    // the wrong reason whenever the admin room cases have a room in flight.
    expect(stable.length, 'GET /api/room returned an empty catalogue').toBeGreaterThan(0);
    expect(cards, 'one card per advertised room').toHaveLength(
      Math.min(stable.length, PUBLIC_ROOM_LIMIT),
    );

    const shownIds = new Set(cards.map((card) => card.roomId));
    for (const room of stable.slice(0, PUBLIC_ROOM_LIMIT)) {
      expect(shownIds, `room ${room.roomid} (${room.type}) is missing from the grid`).toContain(
        room.roomid,
      );
    }

    for (const card of cards) {
      const room = known.find((candidate) => candidate.roomid === card.roomId);
      expect(room, `card links to /reservation/${card.roomId}, absent from GET /api/room`).toBeDefined();

      expect(card.type, `room ${card.roomId} type`).toBe(room!.type);
      expect(card.pricePerNight, `room ${card.roomId} nightly rate`).toBe(room!.roomPrice);
      expect(card.description, `room ${card.roomId} description`).toBe(room!.description.trim());
      expect(card.features.slice().sort(), `room ${card.roomId} amenities`).toEqual(
        room!.features.slice().sort(),
      );
    }
  });

  test('TC02 — every header link scrolls its section into view', async ({ homePage, page }) => {
    await homePage.open();

    // Amenities is excluded on purpose: the link exists but the section does
    // not. That is asserted explicitly below rather than silently skipped.
    const working: NavSection[] = ['Rooms', 'Booking', 'Location', 'Contact'];

    for (const section of working) {
      await homePage.nav.goTo(section);
      await expect(page).toHaveURL(new RegExp(`#${NAV_TARGETS[section]}$`));
      await homePage.expectSectionInViewport(section);
    }

    // Defect D2, asserted as the application behaves today so that a fix breaks
    // this test loudly instead of going unnoticed.
    await expect(homePage.nav.link('Amenities')).toHaveAttribute('href', '/#amenities');
    await expect(page.locator('#amenities')).toHaveCount(0);
  });

  test('TC03 — the room detail shows the description, features and policies of that room', async ({
    homePage,
    reservationPage,
    rooms,
    page,
  }) => {
    await homePage.open();
    const card = await homePage.roomCard(0).read();
    const room = rooms.find((candidate) => candidate.roomid === card.roomId)!;

    await homePage.roomCard(0).bookNowLink.click();

    await expect(page).toHaveURL(new RegExp(`/reservation/${card.roomId}[?]`));
    await reservationPage.expectLoaded();

    await expect(reservationPage.title).toHaveText(`${room.type} Room`);
    await expect(reservationPage.description).toHaveText(room.description.trim());
    await expect(reservationPage.featureNames).toHaveText(room.features);
    await expect(reservationPage.maxGuests).toContainText(/Max \d+ Guests/);

    // The badge is conditional on the room, so its presence has to track the API
    // rather than being asserted unconditionally.
    await expect(reservationPage.accessibleBadge).toHaveCount(room.accessible ? 1 : 0);

    // Policies: the case was written as 15:00-20:00 / 11:00; the application
    // renders 12-hour times (STRATEGY.md, D8) and the application wins.
    await expect(reservationPage.policies).toContainText('Check-in: 3:00 PM - 8:00 PM');
    await expect(reservationPage.policies).toContainText('Check-out: By 11:00 AM');
    await expect(reservationPage.policies).toContainText('No smoking');

    // The rate advertised on the detail page must equal the one on the home card.
    expect(await reservationPage.readAdvertisedNightlyRate()).toBe(card.pricePerNight);
  });

  test('TC04 — "Similar Rooms" offers the rest of the catalogue and never the current room', async ({
    reservationPage,
    rooms,
    api,
    page,
  }) => {
    const current = rooms[0];
    // No booking is created here, so any future window will do.
    const stay = stayOf(addDays(toIso(new Date()), 400), 2);

    const { result: similar, stable, known } = await readAgainstCatalogue(api, async () => {
      await reservationPage.openFor(current.roomid, stay);
      return reservationPage.readSimilarRooms();
    });

    const suggestedIds = new Set(similar.map((room) => room.roomId));
    expect(suggestedIds, 'the room being viewed is never suggested').not.toContain(current.roomid);

    // Similar Rooms is capped at three like the home grid (defect D11), so the
    // rooms that must certainly be offered are the other rooms inside that cap.
    const mustBeOffered = stable
      .slice(0, PUBLIC_ROOM_LIMIT)
      .filter((room) => room.roomid !== current.roomid);
    expect(mustBeOffered.length, 'there is at least one other room to suggest').toBeGreaterThan(0);
    for (const room of mustBeOffered) {
      expect(suggestedIds, `room ${room.roomid} is missing from Similar Rooms`).toContain(room.roomid);
    }

    for (const suggestion of similar) {
      const room = known.find((candidate) => candidate.roomid === suggestion.roomId);
      expect(room, `suggested room ${suggestion.roomId} is not in the catalogue`).toBeDefined();
      expect(suggestion.type, `suggested room ${suggestion.roomId} type`).toBe(room!.type);
      expect(suggestion.pricePerNight, `suggested room ${suggestion.roomId} rate`).toBe(room!.roomPrice);
    }

    const target = similar[0];
    await reservationPage.openSimilarRoom(target.type);
    await expect(page).toHaveURL(new RegExp(`/reservation/${target.roomId}[?]`));
    await expect(reservationPage.title).toHaveText(`${target.type} Room`);
    expect(await reservationPage.readAdvertisedNightlyRate()).toBe(target.pricePerNight);
  });

  test('TC05 — the location panel and the footer show the branding contact details', async ({
    homePage,
    api,
  }) => {
    const { address, contact } = await api.getBranding();

    // Rebuilt from the API's structured address rather than pasted from the page,
    // so a branding change breaks nothing and a rendering change breaks this.
    const expectedAddress = [
      address.line1,
      address.line2,
      address.postTown,
      address.county,
      address.postCode,
    ].join(', ');

    await homePage.open();

    await expect(homePage.locationAddress).toHaveText(expectedAddress);
    await expect(homePage.locationPhone).toHaveText(contact.phone);
    await expect(homePage.locationEmail).toHaveText(contact.email);

    expect(
      await homePage.readFooterContactLines(),
      'the footer repeats address, phone and email',
    ).toEqual([expectedAddress, contact.phone, contact.email]);
  });
});
