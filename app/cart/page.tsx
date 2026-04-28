'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ReservationTimer from '@/components/ReservationTimer';
import type { RoomProduct } from '@/types';
import { MOCK_ROOMS } from '@/data/mockRooms';

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

function calculateNights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

const CATEGORY_STYLE: Record<string, string> = {
  LUXURY:   'bg-gold-100 text-gold-700 border-gold-200',
  MODERATE: 'bg-forest-50 text-forest-600 border-forest-200',
  BUDGET:   'bg-ivory-100 text-gray-500 border-ivory-300',
};

function CartInner() {
  const router = useRouter();
  const params = useSearchParams();

  const roomId    = params.get('roomId') ?? '';
  const sessionId = params.get('sessionId') ?? '';
  const checkIn   = params.get('checkIn') ?? '';
  const checkOut  = params.get('checkOut') ?? '';
  const guests    = Number(params.get('guests') ?? '1');
  const expiresAt = params.get('expiresAt') ?? '';

  const [room, setRoom] = useState<RoomProduct | null>(null);
  const [expired, setExpired] = useState(false);

  const nights = calculateNights(checkIn, checkOut);
  const total  = room ? room.pricePerNight * nights : 0;

  useEffect(() => {
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then(setRoom)
      .catch(() => setRoom(MOCK_ROOMS.find((r) => r.id === roomId) ?? MOCK_ROOMS[0]));
  }, [roomId]);

  function handleExpire() {
    setExpired(true);
    router.push('/rooms');
  }

  if (expired) return null;

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

        {/* Header */}
        <div className="mb-8">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-1">Step 1 of 2</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900">Your Cart</h1>
          <div className="gold-divider w-12 mt-3" />
        </div>

        {/* Timer banner */}
        {expiresAt && (
          <div className="bg-forest-50 border border-forest-200 p-4 mb-6">
            <p className="text-xs text-forest-600 font-medium uppercase tracking-wider mb-2">
              Room Reserved — Complete checkout before time runs out
            </p>
            <ReservationTimer expiresAt={expiresAt} onExpire={handleExpire} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Room card */}
          <div className="lg:col-span-2 bg-white border border-ivory-200 overflow-hidden">
            {room ? (
              <>
                <div className="relative h-56 bg-ivory-200">
                  <Image
                    src={room.images[0] || FALLBACK}
                    alt={room.name}
                    fill
                    className="object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 border ${CATEGORY_STYLE[room.category] ?? ''}`}>
                      {room.category}
                    </span>
                    {room.amenity === 'AC' && (
                      <span className="text-xs font-medium px-2.5 py-1 bg-white/90 text-forest-600 border border-forest-200">
                        AC
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">
                    Floor {room.floor} · Room {room.roomNumber}
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2">{room.name}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{room.description}</p>

                  {/* Amenity pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 5).map((a) => (
                      <span key={a} className="text-xs px-2.5 py-1 bg-ivory-50 text-gray-500 border border-ivory-200">
                        {a}
                      </span>
                    ))}
                    {room.amenities.length > 5 && (
                      <span className="text-xs px-2 py-1 text-gray-400">+{room.amenities.length - 5} more</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 space-y-3">
                <div className="skeleton h-48 w-full mb-4" />
                <div className="skeleton h-6 w-2/3 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
              </div>
            )}
          </div>

          {/* Booking summary */}
          <div className="space-y-4">
            <div className="bg-white border border-ivory-200 p-5">
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              <div className="gold-divider mb-4" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 uppercase tracking-wider text-xs">Check-in</span>
                  <span className="font-medium text-gray-800">{formatDate(checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 uppercase tracking-wider text-xs">Check-out</span>
                  <span className="font-medium text-gray-800">{formatDate(checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 uppercase tracking-wider text-xs">Duration</span>
                  <span className="font-medium text-gray-800">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 uppercase tracking-wider text-xs">Guests</span>
                  <span className="font-medium text-gray-800">{guests} guest{guests !== 1 ? 's' : ''}</span>
                </div>

                <div className="gold-divider my-2" />

                {room && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatCurrency(room.pricePerNight)} × {nights} nights</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 pt-1 text-base">
                  <span>Total</span>
                  <span className="text-forest-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/checkout?roomId=${roomId}&sessionId=${sessionId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&expiresAt=${encodeURIComponent(expiresAt)}`}
              className="block w-full bg-forest-500 hover:bg-forest-600 text-white text-center py-3.5 text-sm font-medium tracking-wider uppercase transition-colors"
            >
              Proceed to Checkout →
            </Link>

            <Link
              href={`/rooms/${roomId}`}
              className="block w-full bg-white border border-ivory-200 hover:border-ivory-300 text-gray-500 text-center py-3 text-sm font-medium tracking-wider uppercase transition-colors"
            >
              ← Change Room
            </Link>

            <p className="text-xs text-gray-400 text-center">
              Room held for 10 minutes. Timer resets if you go back.
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
