import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { RoomCard } from '../components/RoomCard';
import { SiteNav, type NavSection } from '../components/SiteNav';
import type { ContactMessage } from '../data/types';
import { toUkDate, type IsoDate } from '../support/dates';

/** The public single-page site: hero, availability search, room grid, location, contact form, footer. */
export class HomePage extends BasePage {
  protected readonly path = '/';
  readonly nav: SiteNav;

  constructor(page: Page) {
    super(page);
    this.nav = new SiteNav(page);
  }

  protected uniqueMarker(): Locator {
    return this.page.getByRole('heading', { name: 'Welcome to Shady Meadows B&B' });
  }

  // --- rooms ---------------------------------------------------------------

  get roomCards(): Locator {
    return this.page.locator('#rooms .room-card');
  }

  roomCard(index: number): RoomCard {
    return new RoomCard(this.page, this.roomCards.nth(index));
  }

  /** Reads every tile in the grid, in page order. */
  async readRoomCards() {
    // Never read a grid that has not rendered: an empty grid would make every
    // "for each card" assertion below pass without comparing anything.
    await expect(this.roomCards.first()).toBeVisible();
    const count = await this.roomCards.count();
    return Promise.all(Array.from({ length: count }, (_, i) => this.roomCard(i).read()));
  }

  // --- availability search --------------------------------------------------

  private dateInput(which: 'checkin' | 'checkout'): Locator {
    // The two datepickers carry no id of their own: the `for="checkin"` labels
    // point at nothing (defect D3), so position within the booking form is the
    // only stable handle.
    return this.page.locator('#booking input.form-control').nth(which === 'checkin' ? 0 : 1);
  }

  get checkAvailabilityButton(): Locator {
    return this.page.getByRole('button', { name: 'Check Availability' });
  }

  /**
   * The datepickers are react-datepicker text inputs in `DD/MM/YYYY`. Filling
   * leaves the calendar popup open and covering the button below it, so it is
   * dismissed explicitly rather than clicked through.
   */
  async searchAvailability(checkin: IsoDate, checkout: IsoDate): Promise<void> {
    await this.dateInput('checkin').fill(toUkDate(checkin));
    await this.page.keyboard.press('Escape');
    await this.dateInput('checkout').fill(toUkDate(checkout));
    await this.page.keyboard.press('Escape');
    await this.checkAvailabilityButton.click();
  }

  // --- location / footer ----------------------------------------------------

  private contactInfoValue(heading: string): Locator {
    return this.page.locator('#location .d-flex', { has: this.page.getByRole('heading', { name: heading, exact: true }) }).locator('p');
  }

  get locationAddress(): Locator {
    return this.contactInfoValue('Address');
  }

  get locationPhone(): Locator {
    return this.contactInfoValue('Phone');
  }

  get locationEmail(): Locator {
    return this.contactInfoValue('Email');
  }

  get footer(): Locator {
    return this.page.locator('footer');
  }

  async readFooterContactLines(): Promise<string[]> {
    const lines = this.footer.locator('.col-md-4', { has: this.page.getByRole('heading', { name: 'Contact Us' }) }).locator('li');
    await expect(lines.first()).toBeVisible();
    return (await lines.allInnerTexts()).map((line) => line.trim());
  }

  // --- contact form ---------------------------------------------------------

  get contactSection(): Locator {
    return this.page.locator('#contact');
  }

  get submitContactButton(): Locator {
    return this.contactSection.getByRole('button', { name: 'Submit' });
  }

  /** The contact form renders one `<p>` per validation failure, unlike the
   *  reservation form's `<li>`s — the two blocks share no markup. */
  get contactErrors(): Locator {
    return this.contactSection.locator('.alert-danger p');
  }

  get contactConfirmationHeading(): Locator {
    return this.contactSection.getByRole('heading', { level: 3 });
  }

  async fillContactForm(message: Partial<ContactMessage>): Promise<void> {
    const fields: Array<[keyof ContactMessage, string]> = [
      ['name', 'ContactName'],
      ['email', 'ContactEmail'],
      ['phone', 'ContactPhone'],
      ['subject', 'ContactSubject'],
      ['description', 'ContactDescription'],
    ];
    for (const [key, testId] of fields) {
      const value = message[key];
      if (value !== undefined) {
        await this.page.getByTestId(testId).fill(value);
      }
    }
  }

  async expectSectionInViewport(section: NavSection): Promise<void> {
    await expect(this.page.locator(`#${section.toLowerCase()}`)).toBeInViewport();
  }
}
