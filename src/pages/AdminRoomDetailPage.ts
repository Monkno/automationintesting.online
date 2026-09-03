import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { AdminNav } from '../components/AdminNav';
import type { RoomDraft, RoomFeature } from '../data/types';

/** Feature checkbox ids on the *edit* form. `Refreshments` differs from the
 *  create form's `#refreshCheckbox` — see STRATEGY.md defect D6. */
const EDIT_FEATURE_IDS: Record<RoomFeature, string> = {
  WiFi: '#wifiCheckbox',
  TV: '#tvCheckbox',
  Radio: '#radioCheckbox',
  Refreshments: '#refreshmentsCheckbox',
  Safe: '#safeCheckbox',
  Views: '#viewsCheckbox',
};

export interface AdminBookingRow {
  firstname: string;
  lastname: string;
  price: number;
  depositPaid: boolean;
  checkin: string;
  checkout: string;
}

/** `/admin/room/{roomid}` — the room's own details plus every booking held against it. */
export class AdminRoomDetailPage extends BasePage {
  protected readonly path = '/admin/rooms';
  readonly nav: AdminNav;

  constructor(page: Page) {
    super(page);
    this.nav = new AdminNav(page);
  }

  protected uniqueMarker(): Locator {
    return this.page.locator('.room-details');
  }

  /**
   * `.room-details` is in the DOM before the room has been fetched into it, so
   * "the page is loaded" has to mean "the room is in it". Without this, reading
   * a field to compare it after an edit returns an empty string and the
   * comparison fails against the value that was, in fact, correct all along.
   */
  override async expectLoaded(): Promise<void> {
    await super.expectLoaded();
    await expect(this.page.getByRole('heading', { name: /^Room: \S/ })).toBeVisible();
    await expect(this.shownPrice).not.toHaveText('');
  }

  async openFor(roomId: number): Promise<void> {
    await this.gotoPath(`/admin/room/${roomId}`);
    await this.expectLoaded();
  }

  // --- read-only view -------------------------------------------------------

  private detailValue(label: string): Locator {
    return this.page.locator('.room-details p', { hasText: new RegExp(`^${label}:`) }).locator('span');
  }

  get shownType(): Locator {
    return this.detailValue('Type');
  }

  get shownAccessible(): Locator {
    return this.detailValue('Accessible');
  }

  get shownFeatures(): Locator {
    return this.detailValue('Features');
  }

  get shownPrice(): Locator {
    return this.detailValue('Room price');
  }

  // --- edit -----------------------------------------------------------------

  get editButton(): Locator {
    return this.page.getByRole('button', { name: 'Edit' });
  }

  get updateButton(): Locator {
    return this.page.locator('#update');
  }

  /**
   * Reveals the edit form and waits for it to be *populated*, not merely present.
   *
   * This is the one real race on the admin panel. `#update` renders before the
   * room has been read into the form, and `PUT /api/room/{id}` sends every field,
   * so editing one field against an unpopulated form posts nulls for the rest and
   * the server answers 400 "Room name must be set". Nothing about that is visible
   * as a timing problem: the symptom is a room whose price simply did not change.
   */
  async startEditing(): Promise<void> {
    await this.editButton.click();
    await expect(this.updateButton).toBeVisible();
    await expect(this.page.locator('#roomName'), 'the edit form loaded the room').not.toHaveValue('');
    await expect(this.page.locator('#roomPrice'), 'the edit form loaded the price').not.toHaveValue('');
  }

  /** Applies only the supplied fields. Features are set absolutely: everything
   *  listed is checked and everything else is unchecked, so the resulting room
   *  matches the draft rather than merging with whatever it had before. */
  async applyEdits(changes: Partial<RoomDraft>): Promise<void> {
    if (changes.roomPrice !== undefined) {
      await this.page.locator('#roomPrice').fill(String(changes.roomPrice));
    }
    if (changes.type !== undefined) await this.page.locator('#type').selectOption(changes.type);
    if (changes.accessible !== undefined) {
      await this.page.locator('#accessible').selectOption(String(changes.accessible));
    }
    if (changes.features !== undefined) {
      for (const [feature, selector] of Object.entries(EDIT_FEATURE_IDS) as Array<[RoomFeature, string]>) {
        await this.page.locator(selector).setChecked(changes.features.includes(feature));
      }
    }
  }

  /**
   * Saves and reports the status of `PUT /api/room/{id}`.
   *
   * A rejected update leaves the panel showing the *old* values, so without the
   * status a failure reads as "the price did not change" twenty seconds later
   * instead of "the update was refused with 400".
   */
  async saveEdits(): Promise<number> {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/room') && response.request().method() === 'PUT',
    );
    await this.updateButton.click();
    const status = (await responsePromise).status();
    await expect(this.editButton).toBeVisible();
    return status;
  }

  // --- bookings for this room ----------------------------------------------

  get bookingRows(): Locator {
    return this.page.locator('.detail[class*="booking-"]');
  }

  bookingRowFor(lastname: string): Locator {
    return this.bookingRows.filter({ has: this.page.locator(`p:text-is("${lastname}")`) });
  }

  async readBookingRow(lastname: string): Promise<AdminBookingRow> {
    const row = this.bookingRowFor(lastname);
    await expect(row).toBeVisible();

    const cells = (await row.locator('p').allInnerTexts()).map((cell) => cell.trim());
    if (cells.length < 6) {
      throw new Error(`Booking row for "${lastname}" rendered ${cells.length} cells, expected 6: ${JSON.stringify(cells)}`);
    }

    return {
      firstname: cells[0],
      lastname: cells[1],
      price: Number.parseInt(cells[2], 10),
      depositPaid: cells[3] === 'true',
      checkin: cells[4],
      checkout: cells[5],
    };
  }
}
