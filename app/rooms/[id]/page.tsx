'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import RoomStatusBadge from '@/components/RoomStatusBadge';
import ReservationTimer from '@/components/ReservationTimer';
import LockOverlay from '@/components/LockOverlay';
import type { RoomProduct, LockStatusResponse, RoomLock } from '@/types';
import { MOCK_ROOMS } from '@/data/mockRooms';

const FALLBACK = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('ls_session_id');
  if (!id) {
    id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('ls_session_id', id);
  }
  return id;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(amount);
}

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000));
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function RoomDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [room, setRoom] = useState<RoomProduct | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatusResponse>({ status: 'available' });
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkIn') || todayStr());
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOut') || tomorrowStr());
  const [guests, setGuests] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [mySessionId] = useState(() => getOrCreateSessionId());
  const [myLock, setMyLock] = useState<RoomLock | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${id}`);
      const data = await res.json();
      setRoom(data);
      setLockStatus({
        status: data.lockStatus ?? 'available',
        lock: data.lockStatus === 'locked'
          ? { roomId: id, sessionId: data.lockedBySession ?? '', lockedAt: '', expiresAt: data.lockedUntil ?? '' }
          : undefined,
        secondsRemaining: data.secondsRemaining,
      });
    } catch {
      setRoom(MOCK_ROOMS.find((r) => r.id === id) ?? MOCK_ROOMS[0]);
    }
  }, [id]);

  const pollLockStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/status/${id}`);
      const data: LockStatusResponse = await res.json();
      setLockStatus(data);
    } catch {}
  }, [id]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    const interval = setInterval(pollLockStatus, 5_000);
    return () => clearInterval(interval);
  }, [pollLockStatus]);

  async function handleReserve() {
    if (!checkIn || !checkOut || calculateNights(checkIn, checkOut) < 1) return;
    setReserving(true);
    try {
      const res = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, sessionId: mySessionId, checkIn, checkOut, guestName: '' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyLock(data.lock);
        const params = new URLSearchParams({ roomId: id, sessionId: mySessionId, checkIn, checkOut, guests: String(guests), expiresAt: data.expiresAt ?? '' });
        router.push(`/cart?${params.toString()}`);
      } else if (res.status === 409) {
        setLockStatus({ status: 'locked', lock: data.lock, secondsRemaining: data.secondsRemaining });
      }
    } finally {
      setReserving(false);
    }
  }

  const nights = calculateNights(checkIn, checkOut);
  const total = room ? room.pricePerNight * nights : 0;
  const isLockedByMe = lockStatus.status === 'locked' && lockStatus.lock?.sessionId === mySessionId;
  const isLockedByOther = lockStatus.status === 'locked' && !isLockedByMe;

  if (!room) return (
    <div className="min-h-screen bg-ivory-50"><Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-28">
        <div className="skeleton h-96 w-full mb-8" />
        <div className="skeleton h-8 w-64 mb-4 rounded" />
        <div className="skeleton h-4 w-full mb-2 rounded" />
      </div>
    </div>
  );

  const CATEGORY_COLORS: Record<string, string> = {
    LUXURY:   'bg-gold-100 text-gold-700 border-gold-200',
    MODERATE: 'bg-forest-50 text-forest-600 border-forest-200',
    BUDGET:   'bg-ivory-100 text-gray-500 border-ivory-200',
  };

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

        {/* Image */}
        <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden mb-10 bg-ivory-200">
          <Image
            src={room.images[0] || FALLBACK}
            alt={room.name}
            fill
            className="object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
            priority
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`text-xs font-medium px-3 py-1 border ${CATEGORY_COLORS[room.category] ?? ''}`}>
              {room.category}
            </span>
            {room.amenity === 'AC' && (
              <span className="text-xs font-medium px-3 py-1 border bg-white/80 text-forest-600 border-forest-200">
                Air Conditioned
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left — Details */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">
                Floor {room.floor} · Room {room.roomNumber} · Up to {room.maxGuests} guest{room.maxGuests !== 1 ? 's' : ''}
              </p>
              <h1 className="font-display text-4xl font-semibold text-gray-900">{room.name}</h1>
              <div className="gold-divider w-12 mt-4" />
            </div>

            <p className="text-gray-500 leading-relaxed">{room.description}</p>

            {/* Amenities */}
            <div>
              <h3 className="font-display text-xl font-semibold text-gray-800 mb-4">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {room.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-forest-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Lock Status Panel */}
            {isLockedByMe && myLock && (
              <div className="bg-forest-50 border border-forest-200 p-4">
                <p className="text-sm font-semibold text-forest-700 mb-2">Your reservation is active</p>
                <ReservationTimer expiresAt={myLock.expiresAt} onExpire={() => setMyLock(null)} />
              </div>
            )}
            {isLockedByOther && lockStatus.lock && (
              <LockOverlay lock={lockStatus.lock} onRefresh={pollLockStatus} />
            )}
            {!isLockedByMe && !isLockedByOther && (
              <div className="bg-forest-50 border border-forest-200 p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm text-forest-700 font-medium">This room is available — reserve now to hold your place.</p>
              </div>
            )}
          </div>

          {/* Right — Booking panel */}
          <div className="bg-white border border-ivory-200 p-6 self-start sticky top-24 space-y-5">
            <div>
              <p className="text-xs text-gray-400 tracking-wider uppercase">Price per night</p>
              <p className="font-display text-3xl font-semibold text-gray-900 mt-1">
                {formatCurrency(room.pricePerNight)}
                <span className="text-sm font-body font-normal text-gray-400 ml-1">/ night</span>
              </p>
            </div>

            <RoomStatusBadge status={lockStatus.status === 'locked' ? 'locked' : 'available'} secondsRemaining={lockStatus.secondsRemaining} />

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Check-in</label>
                <input type="date" value={checkIn} min={todayStr()} onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full border border-ivory-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Check-out</label>
                <input type="date" value={checkOut} min={checkIn || todayStr()} onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full border border-ivory-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Guests</label>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full border border-ivory-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white">
                  {Array.from({ length: room.maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} Guest{n !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {nights > 0 && (
              <div className="border-t border-ivory-200 pt-4 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatCurrency(room.pricePerNight)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={reserving || isLockedByOther || nights < 1}
              className={`w-full py-3 text-sm font-medium tracking-wider uppercase transition-colors ${
                isLockedByOther
                  ? 'bg-crimson-100 text-crimson-500 cursor-not-allowed border border-crimson-200'
                  : 'bg-forest-500 hover:bg-forest-600 disabled:bg-forest-200 text-white'
              }`}
            >
              {reserving ? 'Reserving…' : isLockedByOther ? 'Reserved — Check Back Soon' : 'Reserve This Room'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your room will be held for 10 minutes while you complete checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
