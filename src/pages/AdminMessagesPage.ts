import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { AdminNav } from '../components/AdminNav';

export interface OpenMessage {
  from: string;
  phone: string;
  email: string;
  subject: string;
  description: string;
}

/** `/admin/message` — the inbox list and the modal that opens a single message. */
export class AdminMessagesPage extends BasePage {
  protected readonly path = '/admin/message';
  readonly nav: AdminNav;

  constructor(page: Page) {
    super(page);
    this.nav = new AdminNav(page);
  }

  protected uniqueMarker(): Locator {
    return this.page.locator('.messages');
  }

  get rows(): Locator {
    return this.page.locator('.messages .row.detail');
  }

  /**
   * Rows carry index-based test ids (`message0`, `message1`, …) which shift
   * whenever anyone else uses this shared inbox. Addressing a row by its unique
   * subject is the only stable way in.
   */
  rowFor(subject: string): Locator {
    return this.rows.filter({ has: this.page.locator(`p:text-is("${subject}")`) });
  }

  /**
   * Read state lives in a `read-true` / `read-false` class on the row.
   *
   * This is an expectation rather than a getter on purpose: closing the message
   * modal does not repaint the row in the same tick, so reading the attribute
   * once returned `read-false` for a message that had just been read. A single
   * `toHaveClass` retries until the repaint lands, without a sleep.
   */
  async expectReadState(subject: string, read: boolean): Promise<void> {
    // `String.raw` matters here: in an ordinary template literal `\b` is the
    // backspace character, not a word boundary, and the resulting pattern never
    // matches anything while printing in the failure output as if it should.
    await expect(this.rowFor(subject)).toHaveClass(
      new RegExp(String.raw`\bread-${read}\b`),
      { timeout: 15_000 },
    );
  }

  get modal(): Locator {
    return this.page.locator('.message-modal [data-testid="message"]');
  }

  async openMessage(subject: string): Promise<OpenMessage> {
    await this.rowFor(subject).click();
    await expect(this.modal).toBeVisible();

    const paragraphs = (await this.modal.locator('p').allInnerTexts()).map((text) => text.trim());
    if (paragraphs.length < 5) {
      throw new Error(`Message modal rendered ${paragraphs.length} paragraphs, expected 5: ${JSON.stringify(paragraphs)}`);
    }

    return {
      from: paragraphs[0].replace(/^From:\s*/, ''),
      phone: paragraphs[1].replace(/^Phone:\s*/, ''),
      email: paragraphs[2].replace(/^Email:\s*/, ''),
      subject: paragraphs[3],
      description: paragraphs[4],
    };
  }

  async closeModal(): Promise<void> {
    await this.modal.getByRole('button', { name: 'Close' }).click();
    await expect(this.modal).toBeHidden();
  }
}
