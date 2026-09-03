/** Date helpers. Everything is handled as a plain `YYYY-MM-DD` string in UTC:
 *  the application's API speaks that format and never a timestamp, so keeping
 *  `Date` objects out of the suite removes a whole class of timezone bugs. */

export type IsoDate = string; // YYYY-MM-DD

export interface StayWindow {
  checkin: IsoDate;
  checkout: IsoDate;
  nights: number;
}

export function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function nightsBetween(checkin: IsoDate, checkout: IsoDate): number {
  const ms = new Date(`${checkout}T00:00:00Z`).getTime() - new Date(`${checkin}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/** `2027-03-05` -> `05/03/2027`, the format the home page datepickers render. */
export function toUkDate(iso: IsoDate): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function stayOf(checkin: IsoDate, nights: number): StayWindow {
  return { checkin, checkout: addDays(checkin, nights), nights };
}
