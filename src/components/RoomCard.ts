import { type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core/BaseComponent';
import { parseGbp } from '../support/money';

/** What one home-page room tile actually shows, read back for comparison against the API. */
export interface RoomCardContents {
  type: string;
  description: string;
  features: string[];
  pricePerNight: number;
  roomId: number;
  checkin: string;
  checkout: string;
}

/** A single room tile in the home page's *Our Rooms* grid. */
export class RoomCard extends BaseComponent {
  constructor(page: Page, root: Locator) {
    super(page, root);
  }

  get bookNowLink(): Locator {
    return this.child('a:has-text("Book now")');
  }

  /**
   * Reads the whole tile in one pass. Returning a plain object lets a test
   * compare the card field by field against `GET /api/room` rather than
   * asserting a hard-coded £100.
   */
  async read(): Promise<RoomCardContents> {
    const href = (await this.bookNowLink.getAttribute('href')) ?? '';
    const match = /^\/reservation\/(\d+)\?checkin=([\d-]+)&checkout=([\d-]+)$/.exec(href);
    if (!match) {
      throw new Error(`"Book now" href is not a reservation link: ${JSON.stringify(href)}`);
    }

    return {
      type: (await this.child('.card-title').innerText()).trim(),
      description: (await this.child('.card-body > p.card-text').innerText()).trim(),
      features: (await this.child('.badge').allInnerTexts()).map((text) => text.trim()),
      pricePerNight: parseGbp(await this.child('.card-footer .fw-bold').innerText()),
      roomId: Number.parseInt(match[1], 10),
      checkin: match[2],
      checkout: match[3],
    };
  }
}
