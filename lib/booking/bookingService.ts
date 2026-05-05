import { ensureRedisReady } from '@/lib/redis/client';
import { confirmRoomLock } from '@/lib/redis/roomLock';
import type { BookingRequest, BookingConfirmation } from '@/types';

const BOOKING_TTL = 60 * 60 * 24 * 30; // 30 days

export function calculateNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export async function createBooking(
  request: BookingRequest,
  roomName: string
): Promise<BookingConfirmation> {
  const bookingReference = await confirmRoomLock(request.roomId, request.sessionId);

  const nights = calculateNights(request.checkIn, request.checkOut);
  const confirmation: BookingConfirmation = {
    bookingReference,
    roomId: request.roomId,
    roomName,
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    nights,
    totalAmount: request.totalAmount,
    currency: 'GBP',
    guestDetails: request.guestDetails,
    confirmedAt: new Date().toISOString(),
  };

  // Best-effort Redis storage — booking proceeds even if Redis is unavailable
  try {
    const redis = await ensureRedisReady();
    await redis.set(`booking:${bookingReference}`, JSON.stringify(confirmation), 'EX', BOOKING_TTL);
  } catch {
    // Redis unavailable — confirmation still returned to the user
  }

  return confirmation;
}

export async function getBooking(bookingReference: string): Promise<BookingConfirmation | null> {
  try {
    const redis = await ensureRedisReady();
    const raw = await redis.get(`booking:${bookingReference}`);
    if (!raw) return null;
    return JSON.parse(raw) as BookingConfirmation;
  } catch {
    return null;
  }
}
