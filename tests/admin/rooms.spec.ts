import { test, expect } from '../../src/fixtures/test';
import { buildRoomDraft } from '../../src/data/factories';
import { PUBLIC_ROOM_LIMIT } from '../../src/support/catalogue';
import { addDays, stayOf, toIso } from '../../src/support/dates';
import type { RoomDraft } from '../../src/data/types';

/**
 * Room administration.
 *
 * Rooms 101, 102 and 103 are the seed catalogue of a public demo and are never
 * touched: every case here creates its own room, and every created room is
 * registered with the janitor so it is deleted even if the test fails halfway.
 */
test.describe('Admin rooms @admin', () => {
  test('TC23 — a created room appears in the admin listing, the API and its public page', async ({
    signedInAdmin,
    adminRoomsPage,
    homePage,
    reservationPage,
    api,
    janitor,
  }) => {
    void signedInAdmin;
    const draft = buildRoomDraft({ type: 'Family', accessible: false, features: ['TV', 'Radio'] });

    await adminRoomsPage.open();
    await adminRoomsPage.fillCreateForm(draft);
    await adminRoomsPage.submitCreate();

    // Admin listing, field by field against what was typed.
    const row = await adminRoomsPage.readRow(draft.roomName);
    janitor.room(row.roomId);

    expect(row.roomName, 'room number').toBe(draft.roomName);
    expect(row.type, 'type').toBe(draft.type);
    expect(row.accessible, 'accessible').toBe(draft.accessible);
    expect(row.roomPrice, 'price').toBe(draft.roomPrice);
    expect(row.features.slice().sort(), 'features').toEqual(draft.features.slice().sort());

    // The backend agrees with the screen.
    const stored = await api.getRoom(row.roomId);
    expect(stored.roomName).toBe(draft.roomName);
    expect(stored.type).toBe(draft.type);
    expect(stored.accessible).toBe(draft.accessible);
    expect(stored.roomPrice).toBe(draft.roomPrice);
    expect(stored.features.slice().sort()).toEqual(draft.features.slice().sort());

    // The case was written as "and on the public site with its type and price".
    // The application does not do that: the home grid is hard-capped at three
    // rooms (defect D11), so a fourth room is never advertised even though the
    // browser receives it from GET /api/room. Asserted as it behaves, so that
    // fixing the cap breaks this line and the case gets revisited.
    await homePage.open();
    await expect(homePage.roomCards).toHaveCount(PUBLIC_ROOM_LIMIT);
    const grid = await homePage.readRoomCards();
    expect(
      grid.map((card) => card.roomId),
      `D11: room ${row.roomId} is not advertised on the capped home grid`,
    ).not.toContain(row.roomId);

    // It is nonetheless fully reachable and correctly priced at its own URL,
    // which is what "published to the public site" amounts to today.
    const stay = stayOf(addDays(toIso(new Date()), 390), 3);
    await reservationPage.openFor(row.roomId, stay);
    await expect(reservationPage.title).toHaveText(`${draft.type} Room`);
    expect(await reservationPage.readAdvertisedNightlyRate()).toBe(draft.roomPrice);
    await reservationPage.priceSummary.expectConsistentWith(draft.roomPrice, stay.nights);
  });

  test('TC24 — editing a room updates the listing, the detail and the public price summary', async ({
    signedInAdmin,
    adminRoomsPage,
    adminRoomDetailPage,
    reservationPage,
    api,
    janitor,
  }) => {
    void signedInAdmin;
    const draft = buildRoomDraft({ roomPrice: 130, features: ['WiFi'] });

    await adminRoomsPage.open();
    await adminRoomsPage.fillCreateForm(draft);
    await adminRoomsPage.submitCreate();
    const created = await adminRoomsPage.readRow(draft.roomName);
    janitor.room(created.roomId);

    const changes: Partial<RoomDraft> = { roomPrice: draft.roomPrice + 95, features: ['TV', 'Safe', 'Views'] };

    await adminRoomsPage.openRoom(draft.roomName);
    await adminRoomDetailPage.expectLoaded();

    // Read before the edit, so the fields nobody touched can be asserted to have
    // survived it — the edit form posts every field, so "unchanged" is a claim.
    const typeBefore = await adminRoomDetailPage.shownType.innerText();
    const accessibleBefore = await adminRoomDetailPage.shownAccessible.innerText();

    await adminRoomDetailPage.startEditing();
    await adminRoomDetailPage.applyEdits(changes);
    expect(await adminRoomDetailPage.saveEdits(), 'PUT /api/room accepted the edit').toBe(202);

    // The detail view now shows the new values, not the old ones.
    await expect(adminRoomDetailPage.shownPrice).toHaveText(String(changes.roomPrice));
    await expect(adminRoomDetailPage.shownFeatures).toHaveText(changes.features!.join(', '));
    await expect(adminRoomDetailPage.shownType, 'type survived the edit').toHaveText(typeBefore);
    await expect(
      adminRoomDetailPage.shownAccessible,
      'accessibility survived the edit',
    ).toHaveText(accessibleBefore);

    // The listing agrees.
    await adminRoomsPage.open();
    const updated = await adminRoomsPage.readRow(draft.roomName);
    expect(updated.roomPrice, 'listed price after the edit').toBe(changes.roomPrice);
    expect(updated.features.slice().sort(), 'listed features after the edit').toEqual(
      changes.features!.slice().sort(),
    );

    // And the backend, which is what the public site reads.
    expect((await api.getRoom(created.roomId)).roomPrice).toBe(changes.roomPrice);

    // The point of the case: the new price is what the public quote is built from.
    const stay = stayOf(addDays(toIso(new Date()), 380), 4);
    await reservationPage.openFor(created.roomId, stay);
    await reservationPage.priceSummary.expectConsistentWith(changes.roomPrice!, stay.nights);
    expect(await reservationPage.readAdvertisedNightlyRate()).toBe(changes.roomPrice);
  });

  test('TC25 — a deleted room disappears from the listing, the catalogue and its own URL', async ({
    signedInAdmin,
    adminRoomsPage,
    api,
    page,
  }) => {
    void signedInAdmin;
    const draft = buildRoomDraft();

    await adminRoomsPage.open();
    await adminRoomsPage.fillCreateForm(draft);
    await adminRoomsPage.submitCreate();
    const created = await adminRoomsPage.readRow(draft.roomName);
    // No janitor registration: deleting it is the case.

    await adminRoomsPage.deleteRoom(created.roomId);
    await expect(adminRoomsPage.rowFor(draft.roomName)).toHaveCount(0);

    // Gone from the catalogue the public site is built from.
    const remaining = await api.listRooms();
    expect(remaining.map((room) => room.roomid)).not.toContain(created.roomId);

    // Gone from its own record. The API answers 500 rather than 404 here
    // (STRATEGY.md, D9); the assertion is on "not retrievable", so it documents
    // today's behaviour without blessing the status code.
    expect(await api.getRoomStatus(created.roomId)).toBeGreaterThanOrEqual(400);

    // And the public reservation page for that id no longer renders a booking.
    await page.goto(`/reservation/${created.roomId}?checkin=2027-01-01&checkout=2027-01-03`);
    await expect(page.getByRole('heading', { name: 'Book This Room' })).toHaveCount(0);
  });

  /**
   * TC26's variants differ only in which field is missing or wrong, so they are
   * one parameterised test. The messages are asserted exactly as the application
   * emits them — including the fact that a missing *price* produces only the
   * opaque "Failed to create room" while a missing *name* is named properly
   * (STRATEGY.md, D10).
   */
  for (const { label, override, expectedError } of [
    {
      label: 'no number and no price',
      override: { roomName: '', roomPrice: undefined },
      expectedError: 'Failed to create room',
    },
    { label: 'no price', override: { roomPrice: undefined }, expectedError: 'Failed to create room' },
    { label: 'no number', override: { roomName: '' }, expectedError: 'Room name must be set' },
    {
      label: 'a price below the minimum',
      override: { roomPrice: -5 },
      expectedError: 'must be greater than or equal to 1',
    },
  ] as Array<{ label: string; override: Partial<RoomDraft>; expectedError: string }>) {
    test(`TC26 — creating a room with ${label} is rejected`, async ({
      signedInAdmin,
      adminRoomsPage,
      api,
    }) => {
      void signedInAdmin;
      const draft = { ...buildRoomDraft(), ...override };

      await adminRoomsPage.open();
      await adminRoomsPage.fillCreateForm(draft);
      const status = await adminRoomsPage.submitCreate();

      expect(status, 'POST /api/room rejected the incomplete room').toBe(400);
      await expect(adminRoomsPage.errorAlert).toHaveText(expectedError);

      // "Nothing was created" is proved by looking for this draft specifically,
      // not by counting rows: another worker's room test may legitimately add
      // one in the same instant. When the draft has no name at all, the check
      // becomes "no nameless room exists", which is the same claim.
      const names = (await api.listRooms()).map((room) => room.roomName);
      expect(names, `a room named "${draft.roomName}" must not exist`).not.toContain(draft.roomName);

      if (draft.roomName !== '') {
        await expect(adminRoomsPage.rowFor(draft.roomName)).toHaveCount(0);
      }
    });
  }
});
