'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import RoomCard from '@/components/RoomCard';
import type { RoomProduct, RoomCategory, RoomAmenity, LockStatusResponse } from '@/types';
import { isEffectivelyLocked } from '@/types';
import { MOCK_ROOMS } from '@/data/mockRooms';

const CATEGORY_ORDER: RoomCategory[] = ['LUXURY', 'MODERATE', 'BUDGET'];
const AMENITY_LABELS: Record<RoomAmenity, string> = {
  AC: 'Air Conditioned',
  NON_AC: 'Natural Ventilation',
};

function SkeletonCard() {
  return (
    <div className="bg-white border border-ivory-100">
      <div className="skeleton h-56 w-full" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-2/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="flex justify-between mt-4">
          <div className="skeleton h-7 w-24 rounded" />
          <div className="skeleton h-9 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}

const TODAY    = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'ct' | 'mock'>('mock');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [category, setCategory] = useState<RoomCategory | 'ALL'>('ALL');
  const [amenity, setAmenity] = useState<RoomAmenity | 'ALL'>('ALL');
  const pollRef  = useRef<NodeJS.Timeout | null>(null);
  const datesRef = useRef<{ checkIn: string; checkOut: string } | undefined>();

  // Keep datesRef current so the polling interval always uses the latest dates
  // without needing to be recreated every time dates change.
  useEffect(() => {
    datesRef.current = checkIn && checkOut ? { checkIn, checkOut } : undefined;
  }, [checkIn, checkOut]);

  async function fetchRooms(search = '', dates?: { checkIn: string; checkOut: string }) {
    try {
      const qs = new URLSearchParams();
      if (search.trim())  qs.set('q',        search.trim());
      if (dates?.checkIn)  qs.set('checkIn',  dates.checkIn);
      if (dates?.checkOut) qs.set('checkOut', dates.checkOut);
      const res  = await fetch(qs.size > 0 ? `/api/rooms?${qs}` : '/api/rooms');
      const data = await res.json();
      setRooms(data.rooms ?? MOCK_ROOMS);
      setSource(data.source ?? 'mock');
      setError(data.error ?? '');
    } catch {
      setRooms(MOCK_ROOMS);
      setSource('mock');
      setError('Unable to load commercetools rooms.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshLockStatuses(currentRooms: RoomProduct[]) {
    const dates = datesRef.current;
    // Build the date query string once for all rooms in this poll cycle
    const qs = dates ? `?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}` : '';
    const updated = await Promise.all(
      currentRooms.map(async (room) => {
        try {
          const lockData: LockStatusResponse = await fetch(
            `/api/booking/status/${room.id}${qs}`
          ).then((r) => r.json());
          const locked = lockData.status === 'locked' && isEffectivelyLocked(lockData.dateConflict);
          return {
            ...room,
            lockStatus:   locked ? ('locked' as const) : ('available' as const),
            lockedUntil:  lockData.lock?.expiresAt,
            dateConflict: lockData.dateConflict,
          };
        } catch {
          return room;
        }
      })
    );
    // Skip re-render if lock statuses haven't changed
    const changed = updated.some(
      (r, i) => r.lockStatus !== currentRooms[i].lockStatus || r.dateConflict !== currentRooms[i].dateConflict
    );
    if (changed) setRooms(updated);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetchRooms(query, datesRef.current);
    }, 250);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, checkIn, checkOut]);

  useEffect(() => {
    if (rooms.length === 0) return;
    pollRef.current = setInterval(() => refreshLockStatuses(rooms), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.length]);

  const categories: Array<RoomCategory | 'ALL'> = [
    'ALL',
    ...CATEGORY_ORDER.filter((candidate) => rooms.some((room) => room.category === candidate)),
  ];

  const amenities: Array<{ value: RoomAmenity | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'All' },
    ...(['AC', 'NON_AC'] as RoomAmenity[])
      .filter((candidate) => rooms.some((room) => room.amenity === candidate))
      .map((candidate) => ({
        value: candidate,
        label: AMENITY_LABELS[candidate],
      })),
  ];

  const filtered = rooms.filter((r) => {
    if (category !== 'ALL' && r.category !== category) return false;
    if (amenity !== 'ALL' && r.amenity !== amenity) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-2">Our Collection</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-gray-900 mb-1">
            Choose Your Room
          </h1>
          {!loading && (
            <p className="text-gray-400 text-sm">
              {filtered.length} room{filtered.length !== 1 ? 's' : ''} available
              {source === 'mock' && (
                <span className="ml-2 text-xs bg-ivory-100 text-gray-400 border border-ivory-200 px-2 py-0.5 rounded-full">
                  demo data
                </span>
              )}
            </p>
          )}
          {!loading && error && (
            <p className="text-sm text-coral-600 mt-2">{error}</p>
          )}
          <div className="gold-divider w-16 mt-4" />
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="room-search" className="sr-only">Search rooms</label>
            <input
              id="room-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms, amenities, or room numbers"
              className="w-full border border-ivory-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-300"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label htmlFor="check-in" className="text-xs text-gray-400 tracking-wider uppercase">Check-in</label>
              <input
                id="check-in"
                type="date"
                value={checkIn}
                min={TODAY}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut && e.target.value >= checkOut) setCheckOut('');
                }}
                className="border border-ivory-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="check-out" className="text-xs text-gray-400 tracking-wider uppercase">Check-out</label>
              <input
                id="check-out"
                type="date"
                value={checkOut}
                min={checkIn || TOMORROW}
                onChange={(e) => setCheckOut(e.target.value)}
                className="border border-ivory-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-300"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 text-xs tracking-wider uppercase font-medium border transition-colors ${
                  category === cat
                    ? 'bg-forest-500 text-white border-forest-500'
                    : 'bg-white text-gray-500 border-ivory-200 hover:border-forest-300 hover:text-forest-600'
                }`}
              >
                {cat === 'ALL' ? 'All Rooms' : cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap sm:ml-auto">
            {amenities.map((a) => (
              <button
                key={a.value}
                onClick={() => setAmenity(a.value)}
                className={`px-3 py-2 text-xs tracking-wider font-medium border transition-colors ${
                  amenity === a.value
                    ? 'bg-gold-500 text-white border-gold-500'
                    : 'bg-white text-gray-500 border-ivory-200 hover:border-gold-300 hover:text-gold-600'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="font-display text-2xl mb-2">No rooms match your filters</p>
            <button onClick={() => { setCategory('ALL'); setAmenity('ALL'); }} className="text-sm text-forest-500 underline mt-2">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((room, i) => (
              <RoomCard key={room.id} room={room} delay={i * 0.07} checkIn={checkIn} checkOut={checkOut} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
