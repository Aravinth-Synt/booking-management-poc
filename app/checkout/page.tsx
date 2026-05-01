'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReservationTimer from '@/components/ReservationTimer';
import type { CartItem, GuestDetails } from '@/types';
import { getCart, clearCart } from '@/lib/cart';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return d;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
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
        <p className="text-gray-500 text-sm mb-6">
          One or more room reservations have expired. Please go back to your cart and re-add the rooms.
        </p>
        <a href="/cart" className="inline-block bg-forest-500 hover:bg-forest-600 text-white text-sm font-medium px-6 py-3 tracking-wider uppercase transition-colors">
          Back to Cart
        </a>
      </div>
    </div>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: '', lastName: '', email: '', phone: '', specialRequests: '',
  });

  useEffect(() => {
    const cart = getCart();
    if (cart.length === 0) {
      router.replace('/cart');
      return;
    }
    // If any lock is already past expiry on load, show expired immediately
    const anyExpired = cart.some((c) => c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now());
    if (anyExpired) { setExpired(true); return; }
    setItems(cart);
  }, [router]);

  const grandTotal = items.reduce((sum, c) => sum + c.pricePerNight * c.nights, 0);
  const earliestExpiry = items.reduce<string>((min, c) =>
    !min || (c.expiresAt && c.expiresAt < min) ? c.expiresAt : min, '');

  async function handleConfirm() {
    if (!guest.firstName || !guest.lastName || !guest.email || !guest.phone) return;
    setSubmitting(true);
    try {
      const confirmations: Array<{ ref: string; roomName: string; checkIn: string; checkOut: string; nights: number; total: number }> = [];

      for (const item of items) {
        const itemTotal = item.pricePerNight * item.nights;
        try {
          const res = await fetch('/api/booking/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: item.roomId,
              sessionId: item.sessionId,
              checkIn: item.checkIn,
              checkOut: item.checkOut,
              guests: item.guests,
              guestDetails: guest,
              totalAmount: itemTotal,
              currency: 'GBP',
            }),
          });
          const data = await res.json();
          confirmations.push({
            ref:      data.confirmation?.bookingReference ?? `DEMO-LSY-${Date.now()}`,
            roomName: item.roomName,
            checkIn:  item.checkIn,
            checkOut: item.checkOut,
            nights:   item.nights,
            total:    itemTotal,
          });
        } catch {
          confirmations.push({
            ref:      `DEMO-LSY-${Date.now()}`,
            roomName: item.roomName,
            checkIn:  item.checkIn,
            checkOut: item.checkOut,
            nights:   item.nights,
            total:    itemTotal,
          });
        }
      }

      clearCart();
      sessionStorage.setItem('lsy_order', JSON.stringify({
        guestName: `${guest.firstName} ${guest.lastName}`,
        grandTotal,
        items: confirmations,
      }));
      router.push('/thank-you');
    } finally {
      setSubmitting(false);
    }
  }

  if (expired) return <LockExpiredPanel />;
  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-1">Final Step</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900">Complete Your Booking</h1>
          <div className="gold-divider w-12 mt-3" />
        </div>

        {earliestExpiry && (
          <div className="bg-forest-50 border border-forest-200 p-4 mb-6">
            <p className="text-xs text-forest-600 font-medium uppercase tracking-wider mb-2">
              Reservation Timer — complete checkout before the first hold expires
            </p>
            <ReservationTimer expiresAt={earliestExpiry} onExpire={() => setExpired(true)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Guest form */}
          <div className="lg:col-span-2 bg-white border border-ivory-200 p-6">
            <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">Guest Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'firstName', label: 'First Name',    type: 'text',  required: true,  full: false },
                { name: 'lastName',  label: 'Last Name',     type: 'text',  required: true,  full: false },
                { name: 'email',     label: 'Email Address', type: 'email', required: true,  full: true  },
                { name: 'phone',     label: 'Phone Number',  type: 'tel',   required: true,  full: true  },
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
              {submitting
                ? `Confirming ${items.length} room${items.length !== 1 ? 's' : ''}…`
                : `Confirm ${items.length} Room${items.length !== 1 ? 's' : ''}`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              By confirming you agree to our cancellation policy. A confirmation will be emailed to {guest.email || 'you'}.
            </p>
          </div>

          {/* Summary sidebar */}
          <div className="bg-white border border-ivory-200 p-5 self-start space-y-4">
            <h3 className="font-display text-lg font-semibold text-gray-900">Order Summary</h3>
            <div className="gold-divider" />

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.roomId} className="space-y-1">
                  <p className="text-sm font-semibold text-gray-800">{item.roomName}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(item.checkIn)} → {formatDate(item.checkOut)} · {item.guests} guest{item.guests !== 1 ? 's' : ''}
                  </p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{formatCurrency(item.pricePerNight)} × {item.nights} nights</span>
                    <span>{formatCurrency(item.pricePerNight * item.nights)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="gold-divider" />
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Grand Total</span>
              <span className="text-forest-600">{formatCurrency(grandTotal)}</span>
            </div>
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
