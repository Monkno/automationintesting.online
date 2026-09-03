/**
 * The application renders every amount as `£100` and the nightly line of the
 * price summary as `£100 x 3 nights`. Tests assert on numbers, never on the
 * formatted string, so a currency or copy change surfaces as one failing helper
 * instead of a dozen failing assertions.
 */

/** `"£1,250"` -> `1250`. Rejects strings with no digits rather than yielding NaN. */
export function parseGbp(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) {
    throw new Error(`Cannot parse an amount out of ${JSON.stringify(raw)}`);
  }

  // Amounts on this site are whole pounds. Only digits are kept: a regex that
  // preserved dots would turn the sentence separator in "£300. Total" into a
  // decimal point and silently divide the figure by 100.
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 0) {
    throw new Error(`Cannot parse an amount out of "${raw}"`);
  }

  return Number.parseInt(digits, 10);
}

export interface NightlyLine {
  pricePerNight: number;
  nights: number;
}

/**
 * `"£100 x 3 nights"` -> `{ pricePerNight: 100, nights: 3 }`.
 *
 * Deliberately not built on `parseGbp`: running the same lossy parser over both
 * halves of the string is how a parser bug hides, because the two errors cancel
 * out when the test then multiplies them together.
 */
export function parseNightlyLine(raw: string): NightlyLine {
  const match = /£\s*([\d,]+)\s*x\s*(\d+)\s*nights?/i.exec(raw);
  if (!match) {
    throw new Error(`"${raw}" is not a nightly price line of the form "£100 x 3 nights"`);
  }

  return {
    pricePerNight: Number.parseInt(match[1].replace(/,/g, ''), 10),
    nights: Number.parseInt(match[2], 10),
  };
}
