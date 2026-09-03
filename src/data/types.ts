/**
 * Shapes returned by the site's own REST API, plus the test-side data models.
 *
 * The API interfaces mirror their payloads verbatim rather than only the fields
 * the current assertions read, so a response can be cast without a lie in it and
 * the next assertion does not have to widen the type first.
 */

export type RoomType = 'Single' | 'Twin' | 'Double' | 'Family' | 'Suite';

/** The six feature checkboxes the admin room form offers. */
export type RoomFeature = 'WiFi' | 'TV' | 'Radio' | 'Refreshments' | 'Safe' | 'Views';

export interface Room {
  roomid: number;
  roomName: string;
  type: RoomType;
  accessible: boolean;
  roomPrice: number;
  features: RoomFeature[];
  description: string;
  image: string;
}

/** What a test asks the admin room form to create. */
export interface RoomDraft {
  roomName: string;
  type: RoomType;
  accessible: boolean;
  roomPrice: number;
  features: RoomFeature[];
}

export interface Booking {
  bookingid: number;
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  bookingdates: { checkin: string; checkout: string };
}

/** The four fields the public reservation form collects. */
export interface Guest {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

export interface MessageSummary {
  id: number;
  name: string;
  subject: string;
  read: boolean;
}

export interface MessageDetail {
  messageid: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

export interface Branding {
  name: string;
  description: string;
  address: {
    line1: string;
    line2: string;
    postTown: string;
    county: string;
    postCode: string;
  };
  contact: { name: string; phone: string; email: string };
  logoUrl: string;
  map: { latitude: number; longitude: number };
}
