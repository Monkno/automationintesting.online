import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { PriceSummary } from '../components/PriceSummary';
import { SiteNav } from '../components/SiteNav';
import { parseGbp } from '../support/money';
import type { Guest } from '../data/types';
import type { StayWindow } from '../support/dates';

export interface SimilarRoom {
  type: string;
  pricePerNight: number;
  roomId: number;
}

/**
 * `/reservation/{roomid}?checkin=…&checkout=…` — room detail plus the booking
 * form. `path` is a placeholder because this page is always opened for a
 * specific room and stay via `openFor()`.
 */
export class ReservationPage extends BasePage {
  protected readonly path = '/reservation/1';
  readonly nav: SiteNav;
  readonly priceSummary: PriceSummary;

  constructor(page: Page) {
    super(page);
    this.nav = new SiteNav(page);
    this.priceSummary = new PriceSummary(page);
  }

  protected uniqueMarker(): Locator {
    return this.page.getByRole('heading', { name: 'Book This Room' });
  }

  async openFor(roomId: number, stay: StayWindow): Promise<void> {
    await this.gotoPath(`/reservation/${roomId}?checkin=${stay.checkin}&checkout=${stay.checkout}`);
    await this.expectLoaded();
  }

  // --- room detail ----------------------------------------------------------

  get title(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get accessibleBadge(): Locator {
    return this.page.locator('.badge', { hasText: 'Accessible' });
  }

  get maxGuests(): Locator {
    return this.page.locator('.text-muted', { hasText: /Max \d+ Guests/ });
  }

  // Each detail block is a heading followed by its content as a sibling. Scoping
  // by "the .mb-4 that contains this heading" looked tidier but silently matched
  // the outer .col-lg-8.mb-4 as well, which pulled the Accessible badge into the
  // feature list. The adjacent-sibling combinator cannot make that mistake.
  get description(): Locator {
    return this.page.locator('h2:text-is("Room Description") + p');
  }

  get featureNames(): Locator {
    return this.page.locator('h2:text-is("Room Features") + .row span');
  }

  get policies(): Locator {
    return this.page.locator('h2:text-is("Room Policies") + .row');
  }

  get advertisedNightlyRate(): Locator {
    return this.page.locator('.booking-card .fs-2.fw-bold');
  }

  async readAdvertisedNightlyRate(): Promise<number> {
    return parseGbp(await this.advertisedNightlyRate.innerText());
  }

  // --- similar rooms --------------------------------------------------------

  get similarRoomCards(): Locator {
    return this.page.locator('section', { has: this.page.getByRole('heading', { name: 'Similar Rooms You Might Like' }) }).locator('.card');
  }

  async readSimilarRooms(): Promise<SimilarRoom[]> {
    // Guard: an empty list would make "none of them is the current room" pass
    // against nothing at all.
    await expect(this.similarRoomCards.first()).toBeVisible();
    const count = await this.similarRoomCards.count();

    return Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const card = this.similarRoomCards.nth(index);
        const href = (await card.getByRole('link', { name: 'View Details' }).getAttribute('href')) ?? '';
        const match = /^\/reservation\/(\d+)\?/.exec(href);
        if (!match) {
          throw new Error(`"View Details" href is not a reservation link: ${JSON.stringify(href)}`);
        }
        return {
          type: (await card.locator('.card-title').innerText()).trim(),
          pricePerNight: parseGbp(await card.locator('.fw-bold.text-primary').innerText()),
          roomId: Number.parseInt(match[1], 10),
        };
      }),
    );
  }

  async openSimilarRoom(type: string): Promise<void> {
    await this.similarRoomCards
      .filter({ has: this.page.getByRole('heading', { name: type, exact: true }) })
      .getByRole('link', { name: 'View Details' })
      .click();
  }

  // --- booking form ---------------------------------------------------------

  /** The initial call-to-action. It is replaced by the guest form once clicked. */
  get openFormButton(): Locator {
    return this.page.locator('#doReservation');
  }

  get confirmButton(): Locator {
    return this.page.locator('.booking-card').getByRole('button', { name: 'Reserve Now' });
  }

  get cancelButton(): Locator {
    return this.page.locator('.booking-card').getByRole('button', { name: 'Cancel' });
  }

  get firstnameInput(): Locator {
    return this.page.locator('.room-firstname');
  }

  get lastnameInput(): Locator {
    return this.page.locator('.room-lastname');
  }

  get emailInput(): Locator {
    return this.page.locator('.room-email');
  }

  get phoneInput(): Locator {
    return this.page.locator('.room-phone');
  }

  get validationErrors(): Locator {
    return this.page.locator('.booking-card .alert-danger li');
  }

  get confirmationPanel(): Locator {
    return this.page.locator('.booking-card', { has: this.page.getByRole('heading', { name: 'Booking Confirmed' }) });
  }

  get confirmedDates(): Locator {
    return this.confirmationPanel.locator('strong');
  }

  get returnHomeLink(): Locator {
    return this.confirmationPanel.getByRole('link', { name: 'Return home' });
  }

  async openGuestForm(): Promise<void> {
    await this.openFormButton.click();
    await expect(this.firstnameInput).toBeVisible();
  }

  async fillGuestForm(guest: Partial<Guest>): Promise<void> {
    const fields: Array<[keyof Guest, Locator]> = [
      ['firstname', this.firstnameInput],
      ['lastname', this.lastnameInput],
      ['email', this.emailInput],
      ['phone', this.phoneInput],
    ];
    for (const [key, locator] of fields) {
      const value = guest[key];
      if (value !== undefined) {
        await locator.fill(value);
      }
    }
  }

  async expectConfirmedFor(stay: StayWindow): Promise<void> {
    await expect(this.confirmationPanel).toContainText(
      'Your booking has been confirmed for the following dates:',
    );
    await expect(this.confirmedDates).toHaveText(`${stay.checkin} - ${stay.checkout}`);
    await expect(this.returnHomeLink).toBeVisible();
  }
}
