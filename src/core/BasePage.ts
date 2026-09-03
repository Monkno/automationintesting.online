import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Common ground for every page object. A subclass declares only `path` and
 * `uniqueMarker()`; `open()` and `expectLoaded()` come for free.
 *
 * The application is a client-rendered Next.js SPA: `goto` resolves against an
 * empty `#root-container` spinner, and every control appears later. There is no
 * "wait for scripts" helper here because there is nothing script-bound to miss —
 * React attaches its handlers in the same commit that renders the element, so
 * Playwright's auto-waiting on the marker is both necessary and sufficient.
 */
export abstract class BasePage {
  /** Path relative to baseURL, e.g. `/admin/rooms`. */
  protected abstract readonly path: string;

  protected constructor(protected readonly page: Page) {}

  /** A locator present only on this page — its identity assertion. */
  protected abstract uniqueMarker(): Locator;

  async open(): Promise<void> {
    await this.gotoPath(this.path);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.uniqueMarker()).toBeVisible();
  }

  /**
   * Navigation with an HTTP-level failure message. A shared demo environment
   * that answers 502 should read as "GET /admin/rooms returned HTTP 502", not
   * as an unexplained locator timeout thirty seconds later.
   */
  protected async gotoPath(path: string): Promise<void> {
    const response = await this.page.goto(path);
    if (response && !response.ok()) {
      throw new Error(`GET ${path} returned HTTP ${response.status()}`);
    }
  }
}
