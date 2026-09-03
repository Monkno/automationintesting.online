import { test, expect } from '../../src/fixtures/test';
import { buildContactMessage } from '../../src/data/factories';

/**
 * The public contact form.
 *
 * `GET /api/message/count` is a single global counter on a site anyone can post
 * to, so no case here asserts an exact delta on it. What proves "the message was
 * not sent" is the status of `POST /api/message`; what proves "it was sent" is
 * retrieving that specific message back and comparing every field against what
 * was typed.
 */
test.describe('Contact form @contact', () => {
  test('TC15 + TC18 — a valid message is acknowledged, counted and stored verbatim', async ({
    homePage,
    contactFlow,
    api,
    adminApi,
    janitor,
  }) => {
    const message = buildContactMessage();

    const result = await contactFlow.sendFromHome(message);
    expect(result.status, 'POST /api/message accepted the message').toBe(200);

    // TC15: the acknowledgement names the sender and quotes the subject.
    await expect(homePage.contactConfirmationHeading).toHaveText(
      `Thanks for getting in touch ${message.name}!`,
    );
    await expect(homePage.contactSection).toContainText(message.subject);

    const summary = await adminApi.findMessageBySubject(message.subject);
    expect(summary, `no message with subject "${message.subject}" reached the inbox`).toBeDefined();
    janitor.message(summary!.id);

    // TC18: the message is counted. A before/after delta on the counter was the
    // obvious formulation and was wrong twice over — the counter is global on a
    // public demo, and this suite's own booking teardown removes messages from
    // it while this test runs. What is actually true and worth asserting is that
    // the new message is unread and that GET /api/message/count agrees with the
    // unread messages GET /api/message lists. `expect.poll` re-reads both
    // together so a concurrent write between the two calls retries rather than
    // fails.
    await expect
      .poll(
        async () => {
          const inbox = await adminApi.listMessages();
          const counted = await api.messageCount();
          return counted - inbox.filter((entry) => !entry.read).length;
        },
        { message: 'GET /api/message/count disagrees with the unread messages in GET /api/message' },
      )
      .toBe(0);

    const unreadIds = (await adminApi.listMessages())
      .filter((entry) => !entry.read)
      .map((entry) => entry.id);
    expect(unreadIds, 'the new message is among the unread ones being counted').toContain(summary!.id);

    const stored = await adminApi.getMessage(summary!.id);
    expect(stored.name, 'stored name').toBe(message.name);
    expect(stored.email, 'stored email').toBe(message.email);
    expect(stored.phone, 'stored phone').toBe(message.phone);
    expect(stored.subject, 'stored subject').toBe(message.subject);
    expect(stored.description, 'stored body').toBe(message.description);
    expect(summary!.read, 'a new message starts unread').toBe(false);
  });

  test('TC16 — an empty contact form reports every required field and sends nothing', async ({
    homePage,
    contactFlow,
  }) => {
    await homePage.open();
    const result = await contactFlow.submit({});

    expect(result.status, 'POST /api/message rejects an empty form').toBe(400);

    // The backend returns these as an unordered set, so the assertion is on the
    // set. Comparing the whole set — not "contains" — means an extra or missing
    // message is also caught.
    const shown = (await homePage.contactErrors.allInnerTexts()).map((text) => text.trim()).sort();
    expect(shown).toEqual(
      [
        'Email may not be blank',
        'Message may not be blank',
        'Message must be between 20 and 2000 characters.',
        'Name may not be blank',
        'Phone may not be blank',
        'Phone must be between 11 and 21 characters.',
        'Subject may not be blank',
        'Subject must be between 5 and 100 characters.',
      ].sort(),
    );

    // The form is still the form: no acknowledgement was rendered over it.
    await expect(homePage.submitContactButton).toBeVisible();
  });

  /**
   * TC17's two halves differ only in which field is too short, so they are one
   * parameterised test. Both are cheap — no fixture beyond the home page — so
   * there is no reason to keep them apart.
   */
  for (const { field, overrides, expected } of [
    {
      field: 'subject',
      overrides: { subject: 'abcd' },
      expected: 'Subject must be between 5 and 100 characters.',
    },
    {
      field: 'message',
      overrides: { description: 'too short' },
      expected: 'Message must be between 20 and 2000 characters.',
    },
  ]) {
    test(`TC17 — a ${field} below its minimum length is rejected`, async ({ homePage, contactFlow }) => {
      const message = buildContactMessage(overrides);

      await homePage.open();
      const result = await contactFlow.submit(message);

      expect(result.status, `POST /api/message rejects the short ${field}`).toBe(400);
      await expect(homePage.contactErrors).toHaveText([expected]);
      await expect(homePage.submitContactButton).toBeVisible();
    });
  }
});
