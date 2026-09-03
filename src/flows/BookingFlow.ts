import { expect, type Page, type Response } from '@playwright/test';
import { ReservationPage } from '../pages/ReservationPage';
import type { Guest } from '../data/types';
import type { StayWindow } from '../support/dates';

export interface SubmittedBooking {
  /** HTTP status of `POST /api/booking`. 201 on success, 400 on validation, 409 on a date clash. */
  status: number;
  /** Present only on 201. Recorded so teardown can remove exactly what the test created. */
  bookingId: number | null;
}

/**
 * The public booking sequence, written once for TC09-TC14 and TC27.
 *
 * The one thing every one of those cases needs and the UI does not give is the
 * id of the booking that was created: without it there is nothing to delete at
 * teardown, and on a shared site an undeleted booking blocks those dates for
 * every future run. So the flow submits the form while watching for the
 * `POST /api/booking` response and hands the id back.
 */
export class BookingFlow {
  private readonly reservationPage: ReservationPage;

  constructor(private readonly page: Page) {
    this.reservationPage = new ReservationPage(page);
  }

  /** Open the room for the given stay and reveal the guest form. */
  async startBooking(roomId: number, stay: StayWindow): Promise<void> {
    await this.reservationPage.openFor(roomId, stay);
    await this.reservationPage.openGuestForm();
  }

  /**
   * Confirms whatever is currently in the guest form.
   *
   * `waitForResponse` is registered before the click, not after: the request is
   * usually answered inside 200 ms and a listener attached afterwards would miss
   * it. It is also the only reliable outcome signal available — a 409 renders no
   * message whatsoever on the page (defect D1).
   */
  async confirm(): Promise<SubmittedBooking> {
    const responsePromise = this.page.waitForResponse(
      (response: Response) =>
        response.url().includes('/api/booking') && response.request().method() === 'POST',
    );
    await this.reservationPage.confirmButton.click();
    const response = await responsePromise;

    const status = response.status();
    let bookingId: number | null = null;
    if (status === 201) {
      bookingId = ((await response.json()) as { bookingid: number }).bookingid;
    }

    return { status, bookingId };
  }

  /** The happy path: open, fill, confirm, and insist the booking was actually created. */
  async book(roomId: number, stay: StayWindow, guest: Guest): Promise<number> {
    await this.startBooking(roomId, stay);
    await this.reservationPage.fillGuestForm(guest);
    const result = await this.confirm();

    expect(
      result.status,
      `POST /api/booking for room ${roomId} ${stay.checkin}..${stay.checkout} should have been created`,
    ).toBe(201);

    return result.bookingId as number;
  }
}
