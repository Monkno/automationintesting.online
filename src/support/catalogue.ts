import type { ApiClient } from './api';
import type { Room } from '../data/types';

/**
 * The public site renders at most three rooms — both in the home page's *Our
 * Rooms* grid and in *Similar Rooms You Might Like* — regardless of how many the
 * catalogue holds. Measured directly: with six rooms in `GET /api/room`, and the
 * browser demonstrably receiving all six, the grid still rendered three.
 *
 * This is defect D11. It is a constant here rather than a magic 3 in four places
 * so that lifting the cap is a one-line change in the suite.
 */
export const PUBLIC_ROOM_LIMIT = 3;

export interface CatalogueSnapshot<T> {
  /** What the page rendered. */
  result: T;
  /**
   * Rooms the API reported both before and immediately after the page was read.
   * Anything that appeared or vanished in between belonged to a room-management
   * test running in another worker, and is excluded rather than asserted on.
   */
  stable: Room[];
  /** Everything either read saw, for "is this card a real room?" lookups. */
  known: Room[];
}

/**
 * Reads the page against the catalogue without racing the admin room tests.
 *
 * TC23-TC26 add and remove rooms on the same shared site while TC01 and TC04 are
 * asserting "the page shows exactly the catalogue". Comparing against a single
 * API read makes those two flaky in direct proportion to how well the room tests
 * work. Reading the catalogue either side of the page and asserting only on the
 * rooms common to both removes the race without weakening the assertion for any
 * room that actually stayed put.
 */
export async function readAgainstCatalogue<T>(
  api: ApiClient,
  readPage: () => Promise<T>,
): Promise<CatalogueSnapshot<T>> {
  const before = await api.listRooms();
  const result = await readPage();
  const after = await api.listRooms();

  const afterIds = new Set(after.map((room) => room.roomid));
  const stable = before.filter((room) => afterIds.has(room.roomid));

  const known = [...before];
  for (const room of after) {
    if (!known.some((candidate) => candidate.roomid === room.roomid)) {
      known.push(room);
    }
  }

  return { result, stable, known };
}
