'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import RoomStatusBadge from '@/components/RoomStatusBadge';
import ReservationTimer from '@/components/ReservationTimer';
import LockOverlay from '@/components/LockOverlay';
import type { RoomProduct, LockStatusResponse, RoomLock } from '@/types';
import { addToCart, isInCart, getCart } from '@/lib/cart';
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

function todayStr()    { return new Date().toISOString().split('T')[0]; }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function RoomDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [room,       setRoom]       = useState<RoomProduct | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatusResponse>({ status: 'available' });
  const [checkIn,    setCheckIn]    = useState(() => searchParams.get('checkIn')  || todayStr());
  const [checkOut,   setCheckOut]   = useState(() => searchParams.get('checkOut') || tomorrowStr());
  const [guests,     setGuests]     = useState(() => Number(searchParams.get('guests') || '1'));
  const [reserving,  setReserving]  = useState(false);
  const [mySessionId]               = useState(() => getOrCreateSessionId());
  const [myLock,     setMyLock]     = useState<RoomLock | null>(null);
  const [inCart,     setInCart]     = useState(false);
  const [cartCount,  setCartCount]  = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [roomUnavailable, setRoomUnavailable] = useState(false);

  // Ref keeps current params available to the polling interval without recreating it
  const statusParamsRef = useRef({ checkIn, checkOut, inventory: 5 });
  useEffect(() => {
    statusParamsRef.current = { checkIn, checkOut, inventory: room?.inventory ?? 5 };
  }, [checkIn, checkOut, room]);

  const fetchRoom = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (checkIn)  qs.set('checkIn',  checkIn);
      if (checkOut) qs.set('checkOut', checkOut);
      const res  = await fetch(`/api/rooms/${id}?${qs}`);
      const data = await res.json();
      setRoom(data);
      setSelectedImageIndex(0);
      setRoomUnavailable(false);
      setLockStatus({
        status:          data.lockStatus ?? 'available',
        lock:            data.lockStatus === 'locked'
          ? { roomId: id, sessionId: data.lockedBySession ?? '', lockedAt: '', expiresAt: data.lockedUntil ?? '' }
          : undefined,
        secondsRemaining: data.secondsRemaining,
        slotsAvailable:   data.slotsAvailable,
        slotsTotal:       data.slotsTotal,
      });
    } catch {
      setRoom(MOCK_ROOMS.find((r) => r.id === id) ?? MOCK_ROOMS[0]);
    }
  }, [id, checkIn, checkOut]);

  const pollLockStatus = useCallback(async () => {
    try {
      const { checkIn: ci, checkOut: co, inventory } = statusParamsRef.current;
      const qs = new URLSearchParams({ inventory: String(inventory) });
      if (ci) qs.set('checkIn',  ci);
      if (co) qs.set('checkOut', co);
      const res  = await fetch(`/api/booking/status/${id}?${qs}`);
      const data: LockStatusResponse = await res.json();
      setLockStatus(data);

      // Check if room became unavailable (fully booked) while user was viewing
      const hasSlotData = data.slotsAvailable !== undefined;
      const isFullyBooked = hasSlotData && data.slotsAvailable === 0;
      const isLockedByMe = data.status === 'locked' && data.lock?.sessionId === mySessionId;

      if (isFullyBooked && !isLockedByMe) {
        setRoomUnavailable(true);
      } else {
        setRoomUnavailable(false);
      }
    } catch {
      setRoomUnavailable(false);
    }
  }, [id, mySessionId]);

  useEffect(() => {
    const syncCart = () => {
      setInCart(isInCart(id));
      setCartCount(getCart().length);
    };

    syncCart();
    window.addEventListener('storage', syncCart);
    window.addEventListener('cart-update', syncCart);

    return () => {
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('cart-update', syncCart);
    };
  }, [id]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    const interval = setInterval(pollLockStatus, 5_000);
    return () => clearInterval(interval);
  }, [pollLockStatus]);

  async function handleReserve() {
    if (!checkIn || !checkOut || calculateNights(checkIn, checkOut) < 1 || !room) return;
    setReserving(true);
    try {
      const res = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: id, sessionId: mySessionId, checkIn, checkOut,
          guestName: '', inventory: room.inventory ?? 5,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyLock(data.lock);
        const nightCount = calculateNights(checkIn, checkOut);
        addToCart({
          roomId:       id,
          sessionId:    mySessionId,
          roomName:     room.name,
          roomImage:    room.images[0] ?? '',
          category:     room.category,
          amenity:      room.amenity,
          checkIn,
          checkOut,
          guests,
          pricePerNight: room.pricePerNight,
          nights:       nightCount,
          expiresAt:    data.expiresAt ?? '',
        });
        const newCount = getCart().length;
        setInCart(true);
        setCartCount(newCount);
      } else if (res.status === 409) {
        setLockStatus({
          status:           'locked',
          lock:             data.lock,
          secondsRemaining: data.secondsRemaining,
          slotsAvailable:   0,
          slotsTotal:       data.inventory,
        });
      }
    } finally {
      setReserving(false);
    }
  }

  const nights         = calculateNights(checkIn, checkOut);
  const total          = room ? room.pricePerNight * nights : 0;
  const hasSlotData    = lockStatus.slotsAvailable !== undefined;
  const isFullyBooked  = hasSlotData && lockStatus.slotsAvailable === 0;
  const isLockedByMe   = lockStatus.status === 'locked' && lockStatus.lock?.sessionId === mySessionId;
  const isLockedByOther = isFullyBooked || (!hasSlotData && lockStatus.status === 'locked' && !isLockedByMe);

  const roomImages = room?.images?.length ? room.images : [FALLBACK];
  const selectedImage = roomImages[selectedImageIndex] ?? roomImages[0];

  useEffect(() => {
    if (roomImages.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedImageIndex((current) => (current + 1) % roomImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [roomImages.length]);

  const handlePrevImage = () => {
    setSelectedImageIndex((current) => (current - 1 + roomImages.length) % roomImages.length);
  };

  const handleNextImage = () => {
    setSelectedImageIndex((current) => (current + 1) % roomImages.length);
  };

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
        <div className="mb-6">
          <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden rounded-3xl bg-ivory-200">
            <Image
              src={selectedImage || FALLBACK}
              alt={`${room.name} image ${selectedImageIndex + 1}`}
              fill
              className="object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
              priority
            />

            {roomImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/40 backdrop-blur-sm border border-white/80 p-2 shadow-lg transition hover:bg-white/70"
                  aria-label="Previous image"
                >
                  <span className="text-lg text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M9.224 1.553a.5.5 0 0 1 .223.67L6.56 8l2.888 5.776a.5.5 0 1 1-.894.448l-3-6a.5.5 0 0 1 0-.448l3-6a.5.5 0 0 1 .67-.223"/>
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/40 backdrop-blur-sm border border-white/80 p-2 shadow-lg transition hover:bg-white/70"
                  aria-label="Next image"
                >
                  <span className="text-lg text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M6.776 1.553a.5.5 0 0 1 .671.223l3 6a.5.5 0 0 1 0 .448l-3 6a.5.5 0 1 1-.894-.448L9.44 8 6.553 2.224a.5.5 0 0 1 .223-.671"/>
                    </svg>
                  </span>
                </button>
              </>
            )}

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

          {roomImages.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {roomImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-28 overflow-hidden rounded-2xl border transition-shadow ${
                    index === selectedImageIndex
                      ? 'border-forest-500 shadow-lg shadow-forest-200/20'
                      : 'border-ivory-200 hover:border-forest-300'
                  }`}
                >
                  <Image
                    src={image || FALLBACK}
                    alt={`${room.name} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
                  />
                </button>
              ))}
            </div>
          )}
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

            {/* Availability panel */}
            {isLockedByMe && myLock && (
              <div className="bg-forest-50 border border-forest-200 p-4">
                <p className="text-sm font-semibold text-forest-700 mb-2">Your reservation is active</p>
                <ReservationTimer expiresAt={myLock.expiresAt} onExpire={() => setMyLock(null)} />
              </div>
            )}
            {isLockedByOther && !hasSlotData && lockStatus.lock && (
              <LockOverlay lock={lockStatus.lock} onRefresh={pollLockStatus} />
            )}
            {isFullyBooked && (
              <div className="bg-crimson-50 border border-crimson-200 p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-crimson-500" />
                <p className="text-sm text-crimson-700 font-medium">
                  All {lockStatus.slotsTotal} rooms are reserved for your selected dates. Try different dates.
                </p>
              </div>
            )}
            {roomUnavailable && !isFullyBooked && (
              <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-sm text-amber-700 font-medium">
                  This room was just booked by another guest. Please refresh or try a different room.
                </p>
              </div>
            )}
            {!isLockedByMe && !isLockedByOther && !roomUnavailable && (
              <div className="bg-forest-50 border border-forest-200 p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm text-forest-700 font-medium">
                  This room is available — reserve now to hold your place.
                </p>
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

            {/* Slot availability indicator */}
            {hasSlotData && (
              <div className={`flex items-center gap-2 text-sm py-2 px-3 border ${
                isFullyBooked
                  ? 'bg-crimson-50 border-crimson-200 text-crimson-700'
                  : lockStatus.slotsAvailable === 1
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-forest-50 border-forest-200 text-forest-700'
              }`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  isFullyBooked ? 'bg-crimson-500' : lockStatus.slotsAvailable === 1 ? 'bg-amber-400' : 'bg-green-500'
                }`} />
                {isFullyBooked
                  ? `Fully booked for these dates (${lockStatus.slotsTotal} rooms)`
                  : lockStatus.slotsAvailable === 1
                  ? 'Last room available!'
                  : `${lockStatus.slotsAvailable} of ${lockStatus.slotsTotal} rooms available`
                }
              </div>
            )}

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

            {inCart ? (
              <div className="space-y-2">
                <div className="bg-forest-50 border border-forest-200 p-3 text-center">
                  <p className="text-xs font-semibold text-forest-700 uppercase tracking-wider">Room Added to Cart</p>
                </div>
                <Link
                  href="/cart"
                  className="block w-full py-3 text-sm font-medium tracking-wider uppercase text-center bg-forest-500 hover:bg-forest-600 text-white transition-colors"
                >
                  View Cart ({cartCount})
                </Link>
                <Link
                  href="/rooms"
                  className="block w-full py-3 text-sm font-medium tracking-wider uppercase text-center bg-white border border-ivory-200 hover:border-forest-300 text-gray-600 transition-colors"
                >
                  Browse More Rooms
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={handleReserve}
                  disabled={reserving || isLockedByOther || nights < 1 || roomUnavailable}
                  className={`w-full py-3 text-sm font-medium tracking-wider uppercase transition-colors ${
                    isLockedByOther || roomUnavailable
                      ? 'bg-crimson-100 text-crimson-500 cursor-not-allowed border border-crimson-200'
                      : 'bg-forest-500 hover:bg-forest-600 disabled:bg-forest-200 text-white'
                  }`}
                >
                  {reserving ? 'Reserving…' : isLockedByOther || roomUnavailable ? 'Not Available' : 'Add to Cart'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Room held for 10 min. Add more rooms or proceed to checkout.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
