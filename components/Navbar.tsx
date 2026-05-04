'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCart, cleanExpiredCartItems } from '@/lib/cart';

interface Suggestion {
  id: string;
  name: string;
  type: 'event' | 'room';
  subtitle: string;
}

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function syncCart() {
      cleanExpiredCartItems(); // Clean expired items first
      setCartCount(getCart().length);
    }
    syncCart();
    window.addEventListener('storage', syncCart);
    window.addEventListener('cart-update', syncCart);
    return () => {
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('cart-update', syncCart);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError('');
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const searchParams = new URLSearchParams({ q: query.trim(), limit: '5' });
        const [eventsRes, roomsRes] = await Promise.all([
          fetch(`/api/events?${searchParams.toString()}`),
          fetch(`/api/rooms?${searchParams.toString()}`),
        ]);

        const [eventsData, roomsData] = await Promise.all([eventsRes.json(), roomsRes.json()]);

        const combined: Suggestion[] = [];

        if (Array.isArray(eventsData.events)) {
          combined.push(
            ...eventsData.events.slice(0, 5).map((event: any) => ({
              id: event.id,
              name: event.name,
              type: 'event' as const,
              subtitle: event.date || 'Event',
            }))
          );
        }

        if (Array.isArray(roomsData.rooms)) {
          combined.push(
            ...roomsData.rooms.slice(0, 5).map((room: any) => ({
              id: room.id,
              name: room.name ?? room.name ?? 'Room',
              type: 'room' as const,
              subtitle: room.location || room.city || 'Room',
            }))
          );
        }

        setResults(combined);
        setOpen(combined.length > 0);
      } catch (err) {
        setError('Search unavailable.');
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedResults = useMemo(() => {
    return results.reduce(
      (groups, item) => {
        groups[item.type].push(item);
        return groups;
      },
      { event: [] as Suggestion[], room: [] as Suggestion[] }
    );
  }, [results]);

  return (
    <nav className="navbar-glass fixed top-0 left-0 right-0 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <span className="font-display text-xl font-semibold tracking-wide text-forest-500">
            London<span className="text-gold-600">Stay</span>
          </span>
          <span className="hidden sm:inline text-xs text-gray-400 border border-ivory-200 px-1.5 py-0.5 font-body">POC</span>
        </Link>

        <div className="relative flex-1 min-w-0 max-w-2xl mx-4" ref={containerRef}>
          <label htmlFor="global-search" className="sr-only">
            Search rooms and events
          </label>
          <div className="relative">
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setOpen(results.length > 0)}
              placeholder="Search rooms or events"
              className="w-full rounded-full border border-white/80 bg-white/90 px-4 py-2 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-forest-500 focus:ring-2 focus:ring-forest-200"
            />
            <span className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-slate-400 text-sm">
              {loading ? (
                '...'
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="h-4 w-4">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                </svg>
              )}
            </span>
          </div>

          {open && (results.length > 0 || error) ? (
            <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {error ? (
                <div className="px-4 py-3 text-sm text-slate-500">{error}</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {groupedResults.event.length > 0 && (
                    <div className="px-3 py-2 bg-slate-50 text-xs uppercase tracking-[0.24em] text-slate-500">
                      Events
                    </div>
                  )}
                  {groupedResults.event.map((item) => (
                    <button
                      key={`event-${item.id}`}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                        router.push(`/events/${item.id}`);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </button>
                  ))}

                  {groupedResults.room.length > 0 && (
                    <div className="px-3 py-2 bg-slate-50 text-xs uppercase tracking-[0.24em] text-slate-500">
                      Rooms
                    </div>
                  )}
                  {groupedResults.room.map((item) => (
                    <button
                      key={`room-${item.id}`}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                        router.push(`/rooms/${item.id}`);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/events" className="text-sm text-gray-500 hover:text-forest-600 font-medium transition-colors tracking-wide">
            Events
          </Link>
          <Link href="/rooms" className="text-sm text-gray-500 hover:text-forest-600 font-medium transition-colors tracking-wide">
            Rooms
          </Link>
          <Link href="/cart" className="relative text-gray-500 hover:text-forest-600 transition-colors" aria-label="Cart">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h13M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-forest-500 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/rooms"
            className="bg-forest-500 hover:bg-forest-600 text-white text-xs font-medium px-5 py-2 tracking-wider uppercase transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
