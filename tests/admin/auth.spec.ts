import { test, expect } from '../../src/fixtures/test';
import { PROTECTED_ADMIN_ROUTES } from '../../src/flows/AdminSessionFlow';

test.describe('Admin authentication @admin', () => {
  test('TC19 — valid credentials open the admin panel', async ({
    adminSession,
    adminRoomsPage,
    adminCredentials,
    page,
  }) => {
    await adminSession.loginThroughForm(adminCredentials.username, adminCredentials.password);

    await expect(page).toHaveURL(/\/admin\/rooms$/);
    // A session that exists in the browser, not just a page that looks right.
    expect(await adminSession.sessionToken(), 'the login issued a session cookie').toBeTruthy();
    // …and content only an authenticated request could have produced.
    await expect(adminRoomsPage.rows.first()).toBeVisible();
  });

  test('TC20 — invalid credentials are refused and leave the user on the login form', async ({
    adminSession,
    adminLoginPage,
    adminCredentials,
    page,
  }) => {
    await adminLoginPage.open();
    await adminLoginPage.submitCredentials(adminCredentials.username, 'definitely-not-the-password');

    await expect(adminLoginPage.errorAlert).toHaveText('Invalid credentials');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(adminLoginPage.submitButton).toBeVisible();
    expect(await adminSession.sessionToken(), 'no session cookie was issued').toBeNull();
  });

  test('TC21 — logging out ends the session, and the panel asks for credentials again', async ({
    adminSession,
    adminLoginPage,
    adminCredentials,
    page,
  }) => {
    await adminSession.loginThroughForm(adminCredentials.username, adminCredentials.password);
    expect(await adminSession.sessionToken()).toBeTruthy();

    // The case was written as "returns to the login form"; the application
    // returns to the public home page instead (STRATEGY.md, D4).
    await adminSession.logout();
    expect(await adminSession.sessionToken(), 'the session cookie was cleared').toBeNull();

    // The session is really gone, not merely navigated away from.
    await page.goto('/admin/rooms');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(adminLoginPage.usernameInput).toBeVisible();
  });

  test('TC22 — every admin route redirects to the login form without a session', async ({
    adminLoginPage,
    page,
  }) => {
    expect(PROTECTED_ADMIN_ROUTES.length, 'there is something to protect').toBeGreaterThan(0);

    for (const route of PROTECTED_ADMIN_ROUTES) {
      await page.goto(route);
      await expect(page, `${route} without a session`).toHaveURL(/\/admin$/);
      await expect(adminLoginPage.usernameInput).toBeVisible();

      // The admin chrome must not be there either: a redirect that still painted
      // the room list for a moment would be a leak, not a redirect.
      await expect(page.locator('[data-testid="roomlisting"]')).toHaveCount(0);
      await expect(page.locator('.messages')).toHaveCount(0);
    }
  });
});
