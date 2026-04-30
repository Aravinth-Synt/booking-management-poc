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
  dateConflict?: boolean;
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
  dateConflict?: boolean;
}

/** true/undefined = locked for these dates; false = lock is for different dates */
export function isEffectivelyLocked(dateConflict: boolean | undefined): boolean {
  return dateConflict !== false;
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
  value:
    | string
    | number
    | boolean
    | LocalizedString
    | Array<string | number | boolean | LocalizedString>
    | Record<string, unknown>;
}

export interface CTVariant {
  id: number;
  sku?: string;
  key?: string;
  prices?: CTPrice[];
  images?: CTImage[];
  attributes?: CTAttribute[];
}

export interface CTProductData {
  name: LocalizedString;
  description?: LocalizedString;
  slug: LocalizedString;
  masterVariant: CTVariant;
  variants?: CTVariant[];
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

export interface CTProduct {
  id: string;
  key?: string;
  version: number;
  masterData: {
    current: CTProductData;
  };
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

export interface CTProductPagedQueryResponse {
  limit: number;
  offset: number;
  count: number;
  total: number;
  results: CTProduct[];
}
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface TourProduct {
  id: string;
  ctId?: string;
  ctKey?: string;
  name: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  durationMinutes: number;
  location: string;
  tags: string[];
  productType: string;
  rezdyCode: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  city?: string;
  state?: string;
  country?: string;
  ticketUrl?: string;
  saleStart?: string;
  saleEnd?: string;
  statusLabel?: string;
  genre?: string;
  subGenre?: string;
  externalEventId?: string;
  syncStatus: SyncStatus;
}

export interface RezdyPriceOption {
  label: string;
  type: string;
  price: number;
}

export interface RezdySession {
  id: string;
  productCode: string;
  startTimeLocal: string;
  endTimeLocal: string;
  seatsAvailable: number;
  seatsReserved: number;
  priceOptions?: RezdyPriceOption[];
}

export interface BookingQuantity {
  optionLabel: string;
  value: number;
  price: number;
}

export interface RezdyProduct {
  productCode: string;
  name: string;
  shortDescription?: string;
  description?: string;
  advertisedPrice?: number;
  currency?: string;
  durationMinutes?: number;
  tags?: string[];
  productType?: string;
  priceOptions?: RezdyPriceOption[];
  images?: Array<{
    itemUrl?: string;
    mediumSizeUrl?: string;
    largeSizeUrl?: string;
  }>;
  locationAddress?: {
    city?: string;
    state?: string;
    countryCode?: string;
  };
  supplier?: {
    name?: string;
  };
}

export interface RezdyBookingRequest {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    productCode: string;
    startTimeLocal: string;
    endTimeLocal: string;
    quantities: Array<{
      optionLabel: string;
      value: number;
    }>;
    amount: number;
  }>;
  payments?: Array<{
    type: string;
    amount: number;
    currency: string;
    label?: string;
  }>;
  sendNotifications?: boolean;
}

export interface RezdyRequestStatus {
  success: boolean;
  error?: {
    errorMessage?: string;
  } | string;
}

export interface RezdyBookingResponse {
  requestStatus?: RezdyRequestStatus;
  booking?: {
    orderNumber?: string;
  };
  [key: string]: unknown;
}

export interface SyncResult {
  productCode: string;
  name: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
}

export interface FullSyncReport {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: SyncResult[];
  durationMs: number;
}
