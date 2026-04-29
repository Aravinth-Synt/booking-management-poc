'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import RoomCard from '@/components/RoomCard';
import type { RoomProduct, RoomCategory, RoomAmenity, LockStatusResponse } from '@/types';
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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'ct' | 'mock'>('mock');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RoomCategory | 'ALL'>('ALL');
  const [amenity, setAmenity] = useState<RoomAmenity | 'ALL'>('ALL');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchRooms(search = '') {
    try {
      const searchParams = new URLSearchParams();
      if (search.trim()) searchParams.set('q', search.trim());
      const path = searchParams.size > 0 ? `/api/rooms?${searchParams.toString()}` : '/api/rooms';
      const res = await fetch(path);
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
    const updated = await Promise.all(
      currentRooms.map(async (room) => {
        try {
          const res = await fetch(`/api/booking/status/${room.id}`);
          const lockData: LockStatusResponse = await res.json();
          return {
            ...room,
            lockStatus: lockData.status === 'locked' ? ('locked' as const) : ('available' as const),
            lockedUntil: lockData.lock?.expiresAt,
          };
        } catch {
          return room;
        }
      })
    );
    setRooms(updated);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetchRooms(query);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

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

        <div className="mb-8">
          <label htmlFor="room-search" className="sr-only">
            Search rooms
          </label>
          <input
            id="room-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms, amenities, or room numbers"
            className="w-full max-w-md border border-ivory-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-300"
          />
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
              <RoomCard key={room.id} room={room} delay={i * 0.07} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
