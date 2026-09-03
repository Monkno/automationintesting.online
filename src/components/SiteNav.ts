import { type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core/BaseComponent';

/** The section a public nav link scrolls to. */
export type NavSection = 'Rooms' | 'Booking' | 'Amenities' | 'Location' | 'Contact';

/** `Amenities` is listed here even though the target section does not exist —
 *  see STRATEGY.md defect D2. The mapping is data so a test can assert the
 *  broken one explicitly instead of quietly skipping it. */
export const NAV_TARGETS: Record<NavSection, string> = {
  Rooms: 'rooms',
  Booking: 'booking',
  Amenities: 'amenities',
  Location: 'location',
  Contact: 'contact',
};

/** The public site's sticky header, present on the home page and every /reservation page. */
export class SiteNav extends BaseComponent {
  constructor(page: Page) {
    super(page, page.locator('nav.navbar').first());
  }

  link(section: NavSection | 'Admin'): Locator {
    return this.root.getByRole('link', { name: section, exact: true });
  }

  async goTo(section: NavSection): Promise<void> {
    await this.link(section).click();
  }
}
