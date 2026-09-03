import { type Page, type Response } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import type { ContactMessage } from '../data/types';

export interface SubmittedContact {
  /** HTTP status of `POST /api/message`. 200 on success, 400 on validation. */
  status: number;
}

/**
 * The contact form sequence, shared by TC15-TC18 and TC28.
 *
 * As with bookings, the status of the underlying POST is captured: it is what
 * proves "the message was not sent" for the negative cases, without relying on a
 * global message counter that other users of this shared site also move.
 */
export class ContactFlow {
  private readonly homePage: HomePage;

  constructor(private readonly page: Page) {
    this.homePage = new HomePage(page);
  }

  async submit(message: Partial<ContactMessage>): Promise<SubmittedContact> {
    await this.homePage.fillContactForm(message);

    const responsePromise = this.page.waitForResponse(
      (response: Response) =>
        response.url().includes('/api/message') && response.request().method() === 'POST',
    );
    await this.homePage.submitContactButton.click();

    return { status: (await responsePromise).status() };
  }

  /** Open the home page and send a valid message in one step. */
  async sendFromHome(message: ContactMessage): Promise<SubmittedContact> {
    await this.homePage.open();
    return this.submit(message);
  }
}
