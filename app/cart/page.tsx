'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import ReservationTimer from '@/components/ReservationTimer';
import type { CartItem } from '@/types';
import { getCart, removeFromCart } from '@/lib/cart';

const FALLBACK = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

const CATEGORY_STYLE: Record<string, string> = {
  LUXURY:   'bg-gold-100 text-gold-700 border-gold-200',
  MODERATE: 'bg-forest-50 text-forest-600 border-forest-200',
  BUDGET:   'bg-ivory-100 text-gray-500 border-ivory-300',
};

function CartItemCard({ item, onRemove }: { item: CartItem; onRemove: (roomId: string) => void }) {
  const total = item.pricePerNight * item.nights;

  async function handleRemove() {
    try {
      await fetch('/api/booking/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: item.roomId, sessionId: item.sessionId }),
      });
    } catch { /* release best-effort */ }
    onRemove(item.roomId);
  }

  function handleExpire() {
    removeFromCart(item.roomId);
    onRemove(item.roomId);
  }

  return (
    <div className="bg-white border border-ivory-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 sm:w-48 sm:h-auto shrink-0 bg-ivory-100">
          <Image
            src={item.roomImage || FALLBACK}
            alt={item.roomName}
            fill
            className="object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
          />
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={`text-xs font-medium px-2 py-0.5 border ${CATEGORY_STYLE[item.category] ?? ''}`}>
              {item.category}
            </span>
            {item.amenity === 'AC' && (
              <span className="text-xs font-medium px-2 py-0.5 bg-white/90 text-forest-600 border border-forest-200">
                AC
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-gray-900">{item.roomName}</h3>
            <button
              onClick={handleRemove}
              className="text-xs text-gray-400 hover:text-crimson-500 transition-colors border border-ivory-200 hover:border-crimson-200 px-3 py-1 shrink-0"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Check-in</p>
              <p className="font-medium text-gray-800 mt-0.5">{formatDate(item.checkIn)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Check-out</p>
              <p className="font-medium text-gray-800 mt-0.5">{formatDate(item.checkOut)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Guests</p>
              <p className="font-medium text-gray-800 mt-0.5">{item.guests} guest{item.guests !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
              <p className="font-medium text-forest-600 mt-0.5">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {formatCurrency(item.pricePerNight)} × {item.nights} night{item.nights !== 1 ? 's' : ''}
          </div>

          {item.expiresAt && (
            <div className="border-t border-ivory-100 pt-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Reservation hold</p>
              <ReservationTimer expiresAt={item.expiresAt} onExpire={handleExpire} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CartInner() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const handleRemove = useCallback((roomId: string) => {
    removeFromCart(roomId);
    setItems(getCart());
  }, []);

  const grandTotal = items.reduce((sum, c) => sum + c.pricePerNight * c.nights, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ivory-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 pt-28 pb-16 text-center">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-2">Cart</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900 mb-4">Your Cart is Empty</h1>
          <p className="text-gray-400 text-sm mb-8">Browse our rooms and add one or more to your cart before checking out.</p>
          <Link
            href="/rooms"
            className="inline-block bg-forest-500 hover:bg-forest-600 text-white text-sm font-medium px-8 py-3 tracking-wider uppercase transition-colors"
          >
            Browse Rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

        <div className="mb-8">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-1">Step 1 of 2</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900">
            Your Cart
            <span className="ml-3 text-lg font-body font-normal text-gray-400">
              {items.length} room{items.length !== 1 ? 's' : ''}
            </span>
          </h1>
          <div className="gold-divider w-12 mt-3" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room list */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <CartItemCard key={item.roomId} item={item} onRemove={handleRemove} />
            ))}

            <Link
              href="/rooms"
              className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700 font-medium mt-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Room
            </Link>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white border border-ivory-200 p-5">
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="gold-divider mb-4" />

              <div className="space-y-2 text-sm mb-4">
                {items.map((item) => (
                  <div key={item.roomId} className="flex justify-between text-gray-500">
                    <span className="truncate mr-2">{item.roomName}</span>
                    <span className="shrink-0">{formatCurrency(item.pricePerNight * item.nights)}</span>
                  </div>
                ))}
              </div>

              <div className="gold-divider mb-4" />
              <div className="flex justify-between font-semibold text-gray-900 text-base">
                <span>Grand Total</span>
                <span className="text-forest-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-forest-500 hover:bg-forest-600 text-white text-center py-3.5 text-sm font-medium tracking-wider uppercase transition-colors"
            >
              Proceed to Checkout →
            </Link>

            <p className="text-xs text-gray-400 text-center">
              Each room is held for 10 minutes. Timers run independently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="skeleton h-8 w-64 rounded" />
      </div>
    }>
      <CartInner />
    </Suspense>
  );
}
