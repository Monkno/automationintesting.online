import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ReservationPage } from '../pages/ReservationPage';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminRoomsPage } from '../pages/AdminRoomsPage';
import { AdminRoomDetailPage } from '../pages/AdminRoomDetailPage';
import { AdminMessagesPage } from '../pages/AdminMessagesPage';
import { BookingFlow } from '../flows/BookingFlow';
import { ContactFlow } from '../flows/ContactFlow';
import { AdminSessionFlow } from '../flows/AdminSessionFlow';
import { ApiClient } from '../support/api';
import type { Guest, Room } from '../data/types';
import type { StayWindow } from '../support/dates';

export interface AdminCredentials {
  username: string;
  password: string;
}

/**
 * Something the test created on the shared site and that must not survive it.
 * Registering is cheap and idempotent; the janitor at teardown does the work.
 */
export interface Janitor {
  /**
   * Removes the booking — and, if the guest is given, the inbox message the
   * backend posts for it.
   *
   * Creating a booking has a side effect nothing in the UI mentions: the server
   * writes an admin message titled "You have a new booking!" from the guest.
   * Cleaning up only the booking left one of those behind per booking; three
   * suite runs had littered the shared inbox with eleven of them before this was
   * noticed. See STRATEGY.md, D12.
   */
  booking(bookingId: number, guest?: Guest): void;
  room(roomId: number): void;
  message(messageId: number): void;
}

export interface Fixtures {
  adminCredentials: AdminCredentials;

  /** Unauthenticated API client — enough for rooms, branding and the message count. */
  api: ApiClient;
  /** API client that has already logged in; required for bookings, messages and writes. */
  adminApi: ApiClient;

  homePage: HomePage;
  reservationPage: ReservationPage;
  adminLoginPage: AdminLoginPage;
  adminRoomsPage: AdminRoomsPage;
  adminRoomDetailPage: AdminRoomDetailPage;
  adminMessagesPage: AdminMessagesPage;

  bookingFlow: BookingFlow;
  contactFlow: ContactFlow;
  adminSession: AdminSessionFlow;

  /** The catalogue as the backend reports it — the source of truth for every price assertion. */
  rooms: Room[];

  /**
   * The seed room this worker books against. Spreading workers over distinct
   * rooms is the first of the two defences against date collisions; the second
   * is `bookableStay`, which searches for a window nobody holds.
   */
  workerRoom: Room;

  /** A free stay window of `nights` nights on `workerRoom`, safe to book. */
  bookableStay: (nights: number) => Promise<StayWindow>;

  /** A browser context that already holds an admin session. */
  signedInAdmin: AdminSessionFlow;

  /** Register anything the test creates; it is removed after the test, best-effort. */
  janitor: Janitor;
}

function credentials(): AdminCredentials {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;
  if (!username || !password) {
    throw new Error('ADMIN_USER and ADMIN_PASS must be set — copy .env.example to .env');
  }
  return { username, password };
}

export const test = base.extend<Fixtures>({
  adminCredentials: async ({}, use) => {
    await use(credentials());
  },

  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  adminApi: async ({ request, adminCredentials }, use) => {
    const client = new ApiClient(request);
    await client.login(adminCredentials.username, adminCredentials.password);
    await use(client);
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  reservationPage: async ({ page }, use) => use(new ReservationPage(page)),
  adminLoginPage: async ({ page }, use) => use(new AdminLoginPage(page)),
  adminRoomsPage: async ({ page }, use) => use(new AdminRoomsPage(page)),
  adminRoomDetailPage: async ({ page }, use) => use(new AdminRoomDetailPage(page)),
  adminMessagesPage: async ({ page }, use) => use(new AdminMessagesPage(page)),

  bookingFlow: async ({ page }, use) => use(new BookingFlow(page)),
  contactFlow: async ({ page }, use) => use(new ContactFlow(page)),
  adminSession: async ({ page }, use) => use(new AdminSessionFlow(page)),

  rooms: async ({ api }, use) => {
    await use(await api.listRooms());
  },

  workerRoom: async ({ rooms }, use, testInfo) => {
    if (rooms.length === 0) {
      throw new Error('GET /api/room returned no rooms; there is nothing to book against');
    }
    await use(rooms[testInfo.workerIndex % rooms.length]);
  },

  bookableStay: async ({ adminApi, workerRoom }, use, testInfo) => {
    await use((nights: number) => adminApi.allocateStay(workerRoom.roomid, nights, testInfo.workerIndex));
  },

  signedInAdmin: async ({ page, adminApi }, use) => {
    const session = new AdminSessionFlow(page);
    await session.loginWithToken(adminApi);
    await use(session);
  },

  /**
   * Teardown is best-effort by design. Some cases delete their own data (TC25),
   * a failing case leaves whatever state it reached, and the shared demo resets
   * itself on its own schedule — so every removal is attempted, none is
   * asserted. Teardown must never turn a green test red, nor mask a red one.
   */
  janitor: async ({ adminApi }, use) => {
    const bookings: Array<{ id: number; guest?: Guest }> = [];
    const rooms: number[] = [];
    const messages: number[] = [];

    await use({
      booking: (id, guest) => bookings.push({ id, guest }),
      room: (id) => rooms.push(id),
      message: (id) => messages.push(id),
    });

    for (const { id, guest } of bookings) {
      await adminApi.deleteBooking(id).catch(() => undefined);
      if (guest) {
        const notifications = await adminApi
          .waitForMessagesFrom(`${guest.firstname} ${guest.lastname}`)
          .catch(() => []);
        for (const notification of notifications) {
          await adminApi.deleteMessage(notification.id).catch(() => undefined);
        }
      }
    }
    for (const id of rooms) {
      await adminApi.deleteRoom(id).catch(() => undefined);
    }
    for (const id of messages) {
      await adminApi.deleteMessage(id).catch(() => undefined);
    }
  },
});

export { expect } from '@playwright/test';
