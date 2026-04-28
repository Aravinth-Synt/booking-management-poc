// ─── Room Types ────────────────────────────────────────────────────────────────

export type RoomCategory = 'LUXURY' | 'MODERATE' | 'BUDGET';
export type RoomAmenity  = 'AC' | 'NON_AC';
export type RoomStatus   = 'available' | 'reserved' | 'booked' | 'maintenance';
export type LockStatus   = 'locked' | 'available' | 'confirmed';

export interface RoomProduct {
  id: string;
  ctKey: string;
  name: string;
  description: string;
  category: RoomCategory;
  amenity: RoomAmenity;
  floor: number;
  roomNumber: string;
  pricePerNight: number;
  maxGuests: number;
  images: string[];
  amenities: string[];
  status: RoomStatus;
  lockStatus?: LockStatus;
  lockedUntil?: string;
  lockedBySession?: string;
}

export interface RoomLock {
  roomId: string;
  sessionId: string;
  lockedAt: string;
  expiresAt: string;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

export interface BookingRequest {
  roomId: string;
  sessionId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestDetails: GuestDetails;
  totalAmount: number;
  currency: 'GBP';
}

export interface BookingConfirmation {
  bookingReference: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  currency: 'GBP';
  guestDetails: GuestDetails;
  confirmedAt: string;
}

export interface ReservationState {
  status: 'idle' | 'reserving' | 'reserved' | 'expired' | 'confirmed' | 'failed';
  lock?: RoomLock;
  secondsRemaining?: number;
  error?: string;
}

export interface LockStatusResponse {
  status: LockStatus | 'available';
  lock?: RoomLock;
  secondsRemaining?: number;
}

// ─── commercetools Types ───────────────────────────────────────────────────────

export interface LocalizedString {
  en: string;
  [locale: string]: string;
}

export interface CTPrice {
  id: string;
  value: { type: string; currencyCode: string; centAmount: number; fractionDigits: number };
  country?: string;
}

export interface CTImage {
  url: string;
  label?: string;
  dimensions?: { w: number; h: number };
}

export interface CTAttribute {
  name: string;
  value: string | number | boolean | LocalizedString;
}

export interface CTVariant {
  id: number;
  sku?: string;
  prices?: CTPrice[];
  images?: CTImage[];
  attributes?: CTAttribute[];
}

export interface CTProductProjection {
  id: string;
  key?: string;
  version: number;
  name: LocalizedString;
  description?: LocalizedString;
  slug: LocalizedString;
  masterVariant: CTVariant;
  variants?: CTVariant[];
  published: boolean;
  createdAt: string;
  lastModifiedAt: string;
}

export interface CTProductProjectionPagedQueryResponse {
  limit: number;
  offset: number;
  count: number;
  total: number;
  results: CTProductProjection[];
}
