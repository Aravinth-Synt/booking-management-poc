'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReservationTimer from '@/components/ReservationTimer';
import type { RoomProduct, GuestDetails, LockStatusResponse } from '@/types';
import { MOCK_ROOMS } from '@/data/mockRooms';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n);
}

function calculateNights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function LockExpiredPanel() {
  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center bg-white border border-crimson-200 p-10">
        <div className="w-14 h-14 rounded-full bg-crimson-50 flex items-center justify-center mx-auto mb-5">
          <svg className="h-7 w-7 text-crimson-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2">Reservation Expired</h2>
        <p className="text-gray-500 text-sm mb-6">Your 10-minute reservation window has passed. Please go back and reserve the room again.</p>
        <a href="/rooms" className="inline-block bg-forest-500 hover:bg-forest-600 text-white text-sm font-medium px-6 py-3 tracking-wider uppercase transition-colors">
          Back to Rooms
        </a>
      </div>
    </div>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId     = params.get('roomId') ?? '';
  const sessionId  = params.get('sessionId') ?? '';
  const checkIn    = params.get('checkIn') ?? '';
  const checkOut   = params.get('checkOut') ?? '';
  const guestCount = Number(params.get('guests') ?? '1');
  const expiresAt  = params.get('expiresAt') ?? '';

  const [room, setRoom] = useState<RoomProduct | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatusResponse | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: '', lastName: '', email: '', phone: '', specialRequests: '',
  });

  const nights = calculateNights(checkIn, checkOut);
  const total = room ? room.pricePerNight * nights : 0;

  useEffect(() => {
    // If expiresAt is already past before we even check, show expired immediately.
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      setExpired(true);
      return;
    }

    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then(setRoom)
      .catch(() => setRoom(MOCK_ROOMS.find((r) => r.id === roomId) ?? MOCK_ROOMS[0]));

    fetch(`/api/booking/status/${roomId}`)
      .then((r) => r.json())
      .then((data: LockStatusResponse) => {
        setLockStatus(data);
        // Only treat as expired if Redis explicitly confirms the lock is gone
        // AND we have no valid local expiresAt timestamp to fall back on.
        // When Redis is down, status comes back as 'available' but expiresAt
        // is still in the future — we trust the local timer in that case.
        const lockHeldByUs = data.status === 'locked' && data.lock?.sessionId === sessionId;
        const localTimerValid = expiresAt && new Date(expiresAt).getTime() > Date.now();
        if (!lockHeldByUs && !localTimerValid) {
          setExpired(true);
        }
      })
      .catch(() => {
        // Network/Redis error — fall back to local timer only
      });
  }, [roomId, sessionId, expiresAt]);

  async function handleConfirm() {
    if (!guest.firstName || !guest.lastName || !guest.email || !guest.phone) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId, sessionId, checkIn, checkOut,
          guests: guestCount,
          guestDetails: guest,
          totalAmount: total,
          currency: 'GBP',
        }),
      });
      const data = await res.json();
      const ref = data.confirmation?.bookingReference ?? `DEMO-LSY-${Date.now()}`;
      router.push(`/thank-you?ref=${ref}&room=${encodeURIComponent(room?.name ?? '')}&checkIn=${checkIn}&checkOut=${checkOut}&nights=${nights}&total=${total}&name=${encodeURIComponent(guest.firstName + ' ' + guest.lastName)}`);
    } catch {
      const ref = `DEMO-LSY-${Date.now()}`;
      router.push(`/thank-you?ref=${ref}&room=${encodeURIComponent(room?.name ?? '')}&checkIn=${checkIn}&checkOut=${checkOut}&nights=${nights}&total=${total}&name=${encodeURIComponent(guest.firstName + ' ' + guest.lastName)}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (expired) return <LockExpiredPanel />;

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-1">Final Step</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900">Complete Your Booking</h1>
          <div className="gold-divider w-12 mt-3" />
        </div>

        {/* Timer banner — uses URL expiresAt so it shows even when Redis is down */}
        {(expiresAt || lockStatus?.lock?.expiresAt) && (
          <div className="bg-forest-50 border border-forest-200 p-4 mb-6">
            <p className="text-xs text-forest-600 font-medium uppercase tracking-wider mb-2">Reservation Timer</p>
            <ReservationTimer
              expiresAt={expiresAt || lockStatus!.lock!.expiresAt}
              onExpire={() => setExpired(true)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Guest form */}
          <div className="lg:col-span-2 bg-white border border-ivory-200 p-6">
            <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">Guest Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'firstName', label: 'First Name', type: 'text', required: true, full: false },
                { name: 'lastName',  label: 'Last Name',  type: 'text', required: true, full: false },
                { name: 'email',     label: 'Email Address', type: 'email', required: true, full: true },
                { name: 'phone',     label: 'Phone Number',  type: 'tel',   required: true, full: true },
              ].map((f) => (
                <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                    {f.label}<span className="text-crimson-500 ml-0.5">*</span>
                  </label>
                  <input
                    type={f.type}
                    value={guest[f.name as keyof GuestDetails] ?? ''}
                    onChange={(e) => setGuest((p) => ({ ...p, [f.name]: e.target.value }))}
                    className="w-full border border-ivory-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Special Requests</label>
                <textarea
                  rows={3}
                  value={guest.specialRequests ?? ''}
                  onChange={(e) => setGuest((p) => ({ ...p, specialRequests: e.target.value }))}
                  className="w-full border border-ivory-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
                  placeholder="Early check-in, dietary requirements, etc."
                />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting || !guest.firstName || !guest.lastName || !guest.email || !guest.phone}
              className="mt-6 w-full bg-forest-500 hover:bg-forest-600 disabled:bg-forest-200 text-white py-3.5 text-sm font-medium tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? 'Confirming Booking…' : 'Confirm Booking'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              By confirming you agree to our cancellation policy. A confirmation will be emailed to {guest.email || 'you'}.
            </p>
          </div>

          {/* Summary sidebar */}
          <div className="bg-white border border-ivory-200 p-5 self-start space-y-4">
            <h3 className="font-display text-lg font-semibold text-gray-900">Booking Summary</h3>
            <div className="gold-divider" />
            {room && (
              <>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Room</p>
                  <p className="font-medium text-gray-800 mt-0.5">{room.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Check-in</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{checkIn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Check-out</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{checkOut}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Nights</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{nights}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Guests</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{guestCount}</p>
                  </div>
                </div>
                <div className="gold-divider" />
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{formatCurrency(room.pricePerNight)} × {nights} nights</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-1">
                    <span>Total</span>
                    <span className="text-forest-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="skeleton h-8 w-64 rounded" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
