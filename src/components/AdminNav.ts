import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core/BaseComponent';

export type AdminSection = 'Rooms' | 'Report' | 'Branding' | 'Messages';

/** The dark admin header. Its links only render once a session exists, which
 *  makes their presence the honest signal of "logged in". */
export class AdminNav extends BaseComponent {
  constructor(page: Page) {
    super(page, page.locator('nav.navbar').first());
  }

  link(section: AdminSection): Locator {
    return this.root.getByRole('link', { name: new RegExp(`^${section}`) });
  }

  get logoutButton(): Locator {
    return this.root.getByRole('button', { name: 'Logout' });
  }

  /** Unread message count, rendered as a red badge next to *Messages*. */
  get unreadBadge(): Locator {
    return this.root.locator('.badge');
  }

  async unreadCount(): Promise<number> {
    return Number.parseInt((await this.unreadBadge.innerText()).trim(), 10);
  }

  /**
   * The admin header renders a Logout button on the login screen too (defect D5),
   * so "Logout is visible" proves nothing. The section links are what only exist
   * behind a session.
   */
  async expectSignedIn(): Promise<void> {
    await expect(this.link('Rooms')).toBeVisible();
    await expect(this.link('Report')).toBeVisible();
    await expect(this.link('Branding')).toBeVisible();
    await expect(this.link('Messages')).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
