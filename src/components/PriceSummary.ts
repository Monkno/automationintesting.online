import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core/BaseComponent';
import { parseGbp, parseNightlyLine } from '../support/money';

export interface PriceBreakdown {
  pricePerNight: number;
  nights: number;
  nightsSubtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
}

/**
 * The *Price Summary* card on a reservation page. Its job is to hand back
 * numbers, so the tests can assert the arithmetic the page performed instead of
 * matching the string "£340".
 */
export class PriceSummary extends BaseComponent {
  constructor(page: Page) {
    super(page, page.locator('.card.bg-light').filter({ hasText: 'Price Summary' }));
  }

  private amountFor(label: string): Locator {
    return this.root.locator('.d-flex', { hasText: label }).locator('span').last();
  }

  get nightlyLine(): Locator {
    return this.root.locator('.d-flex').first().locator('span').first();
  }

  async read(): Promise<PriceBreakdown> {
    // Anchor on the total: it renders last, so once it is present the whole
    // card has been computed and nothing below is read half-rendered.
    await expect(this.amountFor('Total')).toBeVisible();

    const { pricePerNight, nights } = parseNightlyLine(await this.nightlyLine.innerText());

    return {
      pricePerNight,
      nights,
      nightsSubtotal: parseGbp(await this.root.locator('.d-flex').first().locator('span').last().innerText()),
      cleaningFee: parseGbp(await this.amountFor('Cleaning fee').innerText()),
      serviceFee: parseGbp(await this.amountFor('Service fee').innerText()),
      total: parseGbp(await this.amountFor('Total').innerText()),
    };
  }

  /**
   * The core money assertion, shared by TC06, TC07, TC08 and TC24: every figure
   * on the card must be derivable from the room's own API price and the number
   * of nights in the URL. Nothing here is a literal from the spec.
   */
  async expectConsistentWith(expectedPricePerNight: number, expectedNights: number): Promise<void> {
    const breakdown = await this.read();

    expect(breakdown.pricePerNight, 'nightly rate shown vs. GET /api/room').toBe(expectedPricePerNight);
    expect(breakdown.nights, 'nights shown vs. the checkin/checkout in the URL').toBe(expectedNights);
    expect(breakdown.nightsSubtotal, 'nights subtotal = rate x nights').toBe(
      expectedPricePerNight * expectedNights,
    );
    expect(breakdown.total, 'total = subtotal + cleaning + service').toBe(
      breakdown.nightsSubtotal + breakdown.cleaningFee + breakdown.serviceFee,
    );
  }
}
