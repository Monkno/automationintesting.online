import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { AdminNav } from '../components/AdminNav';
import type { RoomDraft, RoomFeature } from '../data/types';

/** The `id` of each feature checkbox on the *create* form. The edit form uses a
 *  different id for Refreshments (defect D6), which is why this map is not shared. */
const CREATE_FEATURE_IDS: Record<RoomFeature, string> = {
  WiFi: '#wifiCheckbox',
  TV: '#tvCheckbox',
  Radio: '#radioCheckbox',
  Refreshments: '#refreshCheckbox',
  Safe: '#safeCheckbox',
  Views: '#viewsCheckbox',
};

export interface AdminRoomRow {
  roomId: number;
  roomName: string;
  type: string;
  accessible: boolean;
  roomPrice: number;
  features: string[];
}

export class AdminRoomsPage extends BasePage {
  protected readonly path = '/admin/rooms';
  readonly nav: AdminNav;

  constructor(page: Page) {
    super(page);
    this.nav = new AdminNav(page);
  }

  protected uniqueMarker(): Locator {
    return this.createButton;
  }

  get rows(): Locator {
    return this.page.locator('[data-testid="roomlisting"]');
  }

  rowFor(roomName: string): Locator {
    return this.rows.filter({ has: this.page.locator(`p:text-is("${roomName}")`) });
  }

  get createButton(): Locator {
    return this.page.locator('#createRoom');
  }

  get errorAlert(): Locator {
    return this.page.locator('.alert-danger');
  }

  /** Fills only the fields the draft supplies, so a test can submit a deliberately incomplete form. */
  async fillCreateForm(draft: Partial<RoomDraft>): Promise<void> {
    if (draft.roomName !== undefined) await this.page.locator('#roomName').fill(draft.roomName);
    if (draft.type !== undefined) await this.page.locator('#type').selectOption(draft.type);
    if (draft.accessible !== undefined) {
      await this.page.locator('#accessible').selectOption(String(draft.accessible));
    }
    if (draft.roomPrice !== undefined) {
      await this.page.locator('#roomPrice').fill(String(draft.roomPrice));
    }
    for (const feature of draft.features ?? []) {
      await this.page.locator(CREATE_FEATURE_IDS[feature]).check();
    }
  }

  /**
   * Submits the create form and reports the status of `POST /api/room`.
   *
   * The status is the only unambiguous evidence that nothing was created: a
   * negative case cannot prove it by counting rows, because another worker's
   * room test may legitimately add one at the same moment. The listener is
   * registered before the click for the usual reason — the response often lands
   * inside 200 ms.
   */
  async submitCreate(): Promise<number> {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/room') && response.request().method() === 'POST',
    );
    await this.createButton.click();
    return (await responsePromise).status();
  }

  /** Reads a listing row back as data, for a field-by-field comparison against the draft. */
  async readRow(roomName: string): Promise<AdminRoomRow> {
    const row = this.rowFor(roomName);
    await expect(row).toBeVisible();

    const cells = await row.locator('p').allInnerTexts();
    if (cells.length < 5) {
      throw new Error(`Room row "${roomName}" rendered ${cells.length} cells, expected 5: ${JSON.stringify(cells)}`);
    }
    const [name, type, accessible, price, details] = cells.map((cell) => cell.trim());

    return {
      roomId: Number.parseInt(((await row.getAttribute('id')) ?? '').replace('room', ''), 10),
      roomName: name,
      type,
      accessible: accessible === 'true',
      roomPrice: Number.parseInt(price, 10),
      features: details.length === 0 ? [] : details.split(',').map((feature) => feature.trim()),
    };
  }

  async openRoom(roomName: string): Promise<void> {
    await this.rowFor(roomName).locator('p').first().click();
  }

  async deleteRoom(roomId: number): Promise<void> {
    // The delete control's id is the bare room number, which is not a valid CSS
    // identifier ("#4"), so it has to be addressed as an attribute.
    await this.page.locator(`span.roomDelete[id="${roomId}"]`).click();
  }
}
