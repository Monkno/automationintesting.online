import type { APIRequestContext } from '@playwright/test';
import type { Booking, Branding, MessageDetail, MessageSummary, Room } from '../data/types';
import { addDays, nightsBetween, stayOf, toIso, type IsoDate, type StayWindow } from './dates';

/**
 * Thin typed client over the site's own REST API (same origin, `/api` prefix).
 *
 * It has three jobs and no others:
 *   1. read the source of truth for rooms and prices, so no test hard-codes £100;
 *   2. verify at the backend what the UI only claims with a banner (TC14, TC18);
 *   3. set up and dispose of test data far faster than the UI could.
 *
 * Authenticated calls carry the `token` cookie that `POST /api/auth/login`
 * returns. Note the cookie is *not* HttpOnly, which is what lets the admin
 * session be seeded straight into a browser context (see AdminSessionFlow).
 */
export class ApiClient {
  private token: string | null = null;

  constructor(private readonly request: APIRequestContext) {}

  // --- authentication -------------------------------------------------------

  async login(username: string, password: string): Promise<string> {
    const response = await this.request.post('/api/auth/login', {
      data: { username, password },
    });
    if (!response.ok()) {
      throw new Error(`POST /api/auth/login returned HTTP ${response.status()}`);
    }
    const body = (await response.json()) as { token?: string };
    if (!body.token) {
      throw new Error(`POST /api/auth/login returned no token: ${JSON.stringify(body)}`);
    }
    this.token = body.token;
    return this.token;
  }

  get authToken(): string {
    if (!this.token) {
      throw new Error('ApiClient.login() must be called before using an authenticated endpoint');
    }
    return this.token;
  }

  private get authHeaders(): Record<string, string> {
    return { Cookie: `token=${this.authToken}` };
  }

  // --- branding -------------------------------------------------------------

  async getBranding(): Promise<Branding> {
    const response = await this.request.get('/api/branding');
    if (!response.ok()) {
      throw new Error(`GET /api/branding returned HTTP ${response.status()}`);
    }
    return (await response.json()) as Branding;
  }

  // --- rooms ----------------------------------------------------------------

  async listRooms(): Promise<Room[]> {
    const response = await this.request.get('/api/room');
    if (!response.ok()) {
      throw new Error(`GET /api/room returned HTTP ${response.status()}`);
    }
    return ((await response.json()) as { rooms: Room[] }).rooms;
  }

  async getRoom(roomId: number): Promise<Room> {
    const response = await this.request.get(`/api/room/${roomId}`);
    if (!response.ok()) {
      throw new Error(`GET /api/room/${roomId} returned HTTP ${response.status()}`);
    }
    return (await response.json()) as Room;
  }

  /** Status only — used to assert that a deleted room is gone, whatever code the API picks. */
  async getRoomStatus(roomId: number): Promise<number> {
    return (await this.request.get(`/api/room/${roomId}`)).status();
  }

  async deleteRoom(roomId: number): Promise<number> {
    return (await this.request.delete(`/api/room/${roomId}`, { headers: this.authHeaders })).status();
  }

  // --- bookings -------------------------------------------------------------

  async listBookings(roomId: number): Promise<Booking[]> {
    const response = await this.request.get(`/api/booking?roomid=${roomId}`, {
      headers: this.authHeaders,
    });
    if (!response.ok()) {
      throw new Error(`GET /api/booking?roomid=${roomId} returned HTTP ${response.status()}`);
    }
    return ((await response.json()) as { bookings: Booking[] }).bookings;
  }

  async deleteBooking(bookingId: number): Promise<number> {
    return (await this.request.delete(`/api/booking/${bookingId}`, { headers: this.authHeaders })).status();
  }

  // --- messages -------------------------------------------------------------

  async messageCount(): Promise<number> {
    const response = await this.request.get('/api/message/count');
    if (!response.ok()) {
      throw new Error(`GET /api/message/count returned HTTP ${response.status()}`);
    }
    return ((await response.json()) as { count: number }).count;
  }

  async listMessages(): Promise<MessageSummary[]> {
    const response = await this.request.get('/api/message', { headers: this.authHeaders });
    if (!response.ok()) {
      throw new Error(`GET /api/message returned HTTP ${response.status()}`);
    }
    return ((await response.json()) as { messages: MessageSummary[] }).messages;
  }

  async getMessage(messageId: number): Promise<MessageDetail> {
    const response = await this.request.get(`/api/message/${messageId}`, { headers: this.authHeaders });
    if (!response.ok()) {
      throw new Error(`GET /api/message/${messageId} returned HTTP ${response.status()}`);
    }
    return (await response.json()) as MessageDetail;
  }

  async findMessageBySubject(subject: string): Promise<MessageSummary | undefined> {
    return (await this.listMessages()).find((message) => message.subject === subject);
  }

  /** Every message from a given sender — used to sweep the "You have a new
   *  booking!" notification the backend writes for each booking (defect D12). */
  async findMessagesFrom(name: string): Promise<MessageSummary[]> {
    return (await this.listMessages()).filter((message) => message.name === name);
  }

  /**
   * The same lookup, but tolerant of the write being slower than the booking
   * response. The backend creates the D12 notification *after* answering the
   * booking POST, so a single-shot read at teardown races it and loses often
   * enough to leak one message per run onto a shared demo site. Polls until the
   * notification shows up, then returns immediately — the timeout is only paid
   * when a booking genuinely produced none.
   */
  async waitForMessagesFrom(name: string, timeoutMs = 5000): Promise<MessageSummary[]> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = await this.findMessagesFrom(name);
      if (found.length > 0 || Date.now() >= deadline) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  async deleteMessage(messageId: number): Promise<number> {
    return (await this.request.delete(`/api/message/${messageId}`, { headers: this.authHeaders })).status();
  }

  // --- date allocation ------------------------------------------------------

  /**
   * The single most important helper in the suite.
   *
   * The site rejects a stay that overlaps an existing booking for the same room
   * with HTTP 409 — and the UI shows *nothing at all* when it does (see
   * STRATEGY.md, defect D1), so a collision does not fail loudly, it hangs until
   * the assertion times out. Two things have to be true at once:
   *
   *   - two workers running in parallel must never pick the same window, so each
   *     worker owns a disjoint slice of the calendar `WORKER_SLICE_DAYS` wide;
   *   - a second run of the suite must not collide with the first run's leftovers,
   *     so the window is not computed but *searched for*: existing bookings are
   *     read back from the API and the first genuinely free window wins.
   *
   * A one-night buffer is left either side because the server's treatment of
   * back-to-back stays (checkout == next checkin) is undocumented.
   */
  async allocateStay(roomId: number, nights: number, workerIndex: number): Promise<StayWindow> {
    const HORIZON_DAYS_AHEAD = 365;
    const WORKER_SLICE_DAYS = 500;
    const BUFFER_NIGHTS = 1;
    const MAX_PROBES = 200;

    const horizon = addDays(toIso(new Date()), HORIZON_DAYS_AHEAD + workerIndex * WORKER_SLICE_DAYS);
    const taken = await this.listBookings(roomId);

    let candidate = horizon;
    for (let probe = 0; probe < MAX_PROBES; probe += 1) {
      const window = stayOf(candidate, nights);
      const clash = taken.find((booking) =>
        overlaps(
          addDays(window.checkin, -BUFFER_NIGHTS),
          addDays(window.checkout, BUFFER_NIGHTS),
          booking.bookingdates.checkin,
          booking.bookingdates.checkout,
        ),
      );

      if (!clash) {
        return window;
      }

      // Jump past the blocking booking instead of crawling a day at a time.
      candidate = addDays(clash.bookingdates.checkout, BUFFER_NIGHTS + 1);
    }

    throw new Error(
      `No free ${nights}-night window for room ${roomId} within ${MAX_PROBES} probes from ${horizon}`,
    );
  }
}

/** Half-open interval overlap: `[aStart, aEnd)` against `[bStart, bEnd)`. */
function overlaps(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate): boolean {
  return nightsBetween(aStart, bEnd) > 0 && nightsBetween(bStart, aEnd) > 0;
}
