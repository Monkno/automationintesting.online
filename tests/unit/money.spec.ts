import { test, expect } from '@playwright/test';
import { parseGbp, parseNightlyLine } from '../../src/support/money';

/**
 * The money parsers, exercised against strings copied verbatim from the running
 * application.
 *
 * This is the one place in the suite where the parser is checked independently.
 * Everywhere else, both sides of a price comparison go through it — so a parser
 * that dropped a digit would drop the same digit twice and the assertion would
 * still pass. These cases are the only thing standing between that bug and a
 * green suite, which is why they exist despite touching no browser.
 */
test.describe('Money parsing @unit', () => {
  test('parseGbp reads the amounts the site renders', () => {
    expect(parseGbp('£100')).toBe(100);
    expect(parseGbp('£225')).toBe(225);
    expect(parseGbp('£25')).toBe(25);
    // The home card renders the rate and its caption in one node.
    expect(parseGbp('£150 per night')).toBe(150);
    expect(parseGbp('£1,250')).toBe(1250);
    // A separator that is not a thousands separator must not become a decimal point.
    expect(parseGbp('Total: £340.')).toBe(340);
  });

  test('parseGbp refuses strings with no amount in them', () => {
    expect(() => parseGbp('Total')).toThrow(/Cannot parse an amount/);
    expect(() => parseGbp('')).toThrow(/Cannot parse an amount/);
    expect(() => parseGbp(null)).toThrow(/Cannot parse an amount/);
  });

  test('parseNightlyLine splits the rate from the night count', () => {
    expect(parseNightlyLine('£100 x 3 nights')).toEqual({ pricePerNight: 100, nights: 3 });
    expect(parseNightlyLine('£225 x 1 night')).toEqual({ pricePerNight: 225, nights: 1 });
    expect(parseNightlyLine('£1,250 x 12 nights')).toEqual({ pricePerNight: 1250, nights: 12 });
  });

  test('parseNightlyLine refuses a line that is not a nightly rate', () => {
    // Reading "£340" as a rate of 340 for 0 nights would make the total check
    // trivially satisfiable, so this has to throw rather than guess.
    expect(() => parseNightlyLine('£340')).toThrow(/nightly price line/);
    expect(() => parseNightlyLine('Cleaning fee')).toThrow(/nightly price line/);
  });
});
