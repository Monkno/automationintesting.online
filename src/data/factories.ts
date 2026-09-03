import { faker } from '@faker-js/faker';
import type { ContactMessage, Guest, RoomDraft } from './types';

/**
 * A token that is unique per worker and per millisecond, and identifiable as
 * belonging to this suite. Everything the suite writes to the shared site
 * carries one, so a leftover row can always be traced back to a run and never
 * be confused with another user's data.
 */
export function uniqueTag(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `w${worker}${Date.now()}${faker.string.numeric(3)}`;
}

/**
 * A guest whose phone number is inside the 11-21 character range the backend
 * enforces. Tests override only the field they are about, e.g.
 * `buildGuest({ phone: '0123456789' })`.
 */
export function buildGuest(overrides: Partial<Guest> = {}): Guest {
  const tag = uniqueTag();
  return {
    firstname: faker.person.firstName().replace(/[^A-Za-z]/g, ''),
    lastname: `Qa${tag}`,
    email: `qa.suite+${tag}@example.com`,
    phone: `0${faker.string.numeric(12)}`, // 13 characters
    ...overrides,
  };
}

export function buildContactMessage(overrides: Partial<ContactMessage> = {}): ContactMessage {
  const tag = uniqueTag();
  return {
    name: `Qa Suite ${tag}`,
    email: `qa.suite+${tag}@example.com`,
    phone: `0${faker.string.numeric(12)}`,
    subject: `QA suite enquiry ${tag}`,
    description: `Automated end-to-end check ${tag}. ${faker.lorem.sentence(12)}`,
    ...overrides,
  };
}

/**
 * A room the suite owns. The name is numeric because the admin listing renders
 * it as a room number, and it is prefixed with 9 so a stray row is obviously
 * not one of the seed rooms 101/102/103.
 */
export function buildRoomDraft(overrides: Partial<RoomDraft> = {}): RoomDraft {
  return {
    roomName: `9${faker.string.numeric(5)}`,
    type: 'Double',
    accessible: true,
    roomPrice: faker.number.int({ min: 120, max: 480 }),
    features: ['WiFi', 'Safe'],
    ...overrides,
  };
}
