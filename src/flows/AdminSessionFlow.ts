import { expect, type Page } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminNav } from '../components/AdminNav';
import type { ApiClient } from '../support/api';

/** Every route that only exists behind an admin session. */
export const PROTECTED_ADMIN_ROUTES = [
  '/admin/rooms',
  '/admin/report',
  '/admin/branding',
  '/admin/message',
];

/**
 * Admin authentication, with two deliberately different entry points.
 *
 * TC19-TC21 are *about* the login form, so they drive it. TC23-TC28 merely need
 * to be signed in, and paying for a form round-trip in each of them buys nothing
 * — they seed the session cookie instead. Both share one definition of what
 * "signed in" means (`AdminNav.expectSignedIn`), so a change to the panel breaks
 * them in the same place.
 */
export class AdminSessionFlow {
  private readonly loginPage: AdminLoginPage;
  private readonly nav: AdminNav;

  constructor(private readonly page: Page) {
    this.loginPage = new AdminLoginPage(page);
    this.nav = new AdminNav(page);
  }

  async loginThroughForm(username: string, password: string): Promise<void> {
    await this.loginPage.open();
    await this.loginPage.submitCredentials(username, password);
    await this.page.waitForURL('**/admin/rooms');
    await this.nav.expectSignedIn();
  }

  /**
   * Seeds the session straight into the browser context. The application's
   * `token` cookie is not HttpOnly and is not paired with any CSRF token, so a
   * cookie obtained from `POST /api/auth/login` is a complete session — which is
   * itself worth recording (STRATEGY.md, observation D7).
   */
  async loginWithToken(api: ApiClient): Promise<void> {
    await this.page.context().addCookies([
      {
        name: 'token',
        value: api.authToken,
        domain: new URL(this.baseUrl()).hostname,
        path: '/',
      },
    ]);
  }

  /** Returns the session cookie's value, or null once it has been cleared. */
  async sessionToken(): Promise<string | null> {
    const cookies = await this.page.context().cookies();
    return cookies.find((cookie) => cookie.name === 'token')?.value ?? null;
  }

  /**
   * Logging out drops the user on the *public home page*, not back on the login
   * form as one might expect (see STRATEGY.md, D4 — the case was written the
   * other way round and the application wins).
   */
  async logout(): Promise<void> {
    await this.nav.logout();
    await this.page.waitForURL(new URL('/', this.baseUrl()).toString());
    await expect(this.page.getByRole('heading', { name: 'Welcome to Shady Meadows B&B' })).toBeVisible();
  }

  private baseUrl(): string {
    return process.env.BASE_URL ?? 'https://automationintesting.online';
  }
}
