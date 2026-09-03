import { test, expect } from '../../src/fixtures/test';
import { buildContactMessage, buildGuest } from '../../src/data/factories';
import type { AdminMessagesPage } from '../../src/pages/AdminMessagesPage';
import type { ApiClient } from '../../src/support/api';

/**
 * The red badge next to *Messages* must show the number of unread messages the
 * backend holds. Polled, because both sides move: other workers create booking
 * notifications and their teardown removes them.
 */
async function expectBadgeMatchesBackend(
  messagesPage: AdminMessagesPage,
  adminApi: ApiClient,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const unread = (await adminApi.listMessages()).filter((entry) => !entry.read).length;
        return (await messagesPage.nav.unreadCount()) - unread;
      },
      { message: 'the unread badge does not match the unread messages in GET /api/message' },
    )
    .toBe(0);
}

test.describe('Admin bookings and messages @admin', () => {
  /**
   * TC27 keeps its own booking rather than sharing TC09's. TC09/TC14 verify the
   * write path (banner plus stored record) and need no session; this verifies the
   * read path in the panel and needs one. Sharing them would couple a public-site
   * case to an admin session for no gain.
   */
  test('TC27 — a booking made on the public site is listed against its room in the panel', async ({
    bookingFlow,
    signedInAdmin,
    adminRoomDetailPage,
    workerRoom,
    bookableStay,
    janitor,
  }) => {
    void signedInAdmin;
    const stay = await bookableStay(2);
    const guest = buildGuest();

    janitor.booking(await bookingFlow.book(workerRoom.roomid, stay, guest), guest);

    await adminRoomDetailPage.openFor(workerRoom.roomid);

    // The last name carries a per-worker, per-millisecond tag, so this row can
    // only be the one this test created — even with other bookings on the room.
    const row = await adminRoomDetailPage.readBookingRow(guest.lastname);
    expect(row.firstname, 'guest first name in the panel').toBe(guest.firstname);
    expect(row.lastname, 'guest last name in the panel').toBe(guest.lastname);
    expect(row.checkin, 'check-in in the panel').toBe(stay.checkin);
    expect(row.checkout, 'check-out in the panel').toBe(stay.checkout);

    // The panel computes the stay's value; it must agree with the room's rate.
    expect(row.price, 'price shown = nightly rate x nights').toBe(workerRoom.roomPrice * stay.nights);
  });

  test('TC28 — a contact message reaches the inbox, opens in full and is then marked read', async ({
    contactFlow,
    signedInAdmin,
    adminMessagesPage,
    adminApi,
    janitor,
  }) => {
    void signedInAdmin;
    const message = buildContactMessage();

    expect((await contactFlow.sendFromHome(message)).status, 'the message was accepted').toBe(200);

    const summary = await adminApi.findMessageBySubject(message.subject);
    expect(summary, `no message with subject "${message.subject}" reached the inbox`).toBeDefined();
    janitor.message(summary!.id);

    await adminMessagesPage.open();

    // Listed, unread, with the sender's name against the subject.
    const row = adminMessagesPage.rowFor(message.subject);
    await expect(row).toBeVisible();
    await expect(row).toContainText(message.name);
    await adminMessagesPage.expectReadState(message.subject, false);

    // The badge must agree with the backend before anything is opened.
    await expectBadgeMatchesBackend(adminMessagesPage, adminApi);

    // Opened: every field the sender typed, compared field by field.
    const opened = await adminMessagesPage.openMessage(message.subject);
    expect(opened.from, 'sender name').toBe(message.name);
    expect(opened.email, 'sender email').toBe(message.email);
    expect(opened.phone, 'sender phone').toBe(message.phone);
    expect(opened.subject, 'subject').toBe(message.subject);
    expect(opened.description, 'message body').toBe(message.description);

    await adminMessagesPage.closeModal();

    // Reading it flips the row's state, in the panel and in the backend.
    await adminMessagesPage.expectReadState(message.subject, true);

    const reread = (await adminApi.listMessages()).find((entry) => entry.id === summary!.id);
    expect(reread, 'the message is still in the inbox after being opened').toBeDefined();
    expect(reread!.read, 'the backend records it as read').toBe(true);

    // And the badge follows. This was first written as "the badge is one lower
    // than before", which is wrong and was measured to be wrong: under four
    // workers it dropped by two, because another worker's teardown removed a
    // booking notification at the same moment. The badge is a global counter, so
    // the assertion that holds is that it tracks the backend, not that it moved
    // by the amount this test caused.
    await expectBadgeMatchesBackend(adminMessagesPage, adminApi);
  });
});
