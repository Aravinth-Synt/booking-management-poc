'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RoomCard from '@/components/RoomCard';
import EventCard from '@/components/EventCard';
import type { RoomProduct } from '@/types';
import type { Event } from '@/types/events';

const HOME_ROOM_LIMIT = 3;
const HOME_EVENT_LIMIT = 4;

function SkeletonCard() {
  return (
    <div className="bg-white border border-ivory-100">
      <div className="skeleton h-56 w-full" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-2/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

export default function HomeShowcase() {
  const [rooms, setRooms] = useState<RoomProduct[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [roomsRes, eventsRes] = await Promise.all([
          fetch('/api/rooms'),
          fetch('/api/events'),
        ]);

        const [roomsData, eventsData] = await Promise.all([
          roomsRes.json(),
          eventsRes.json(),
        ]);

        if (!active) return;

        setRooms((roomsData.rooms ?? []).slice(0, HOME_ROOM_LIMIT));
        setEvents((eventsData.events ?? []).slice(0, HOME_EVENT_LIMIT));
      } catch {
        if (!active) return;
        setRooms([]);
        setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-20">
      <div>
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-2">Stay With Us</p>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-gray-900">Featured Rooms</h2>
            <div className="gold-divider w-16 mt-4" />
          </div>
          <Link
            href="/rooms"
            className="hidden sm:inline-flex text-xs px-4 py-2 bg-forest-500 hover:bg-forest-600 text-white font-medium tracking-wider uppercase transition-colors"
          >
            View All Rooms
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: HOME_ROOM_LIMIT }).map((_, index) => (
              <SkeletonCard key={`room-skeleton-${index}`} />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white border border-ivory-200 px-6 py-16 text-center text-gray-500">
            No rooms available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room, index) => (
              <RoomCard key={room.id} room={room} delay={index * 0.06} />
            ))}
          </div>
        )}

        <div className="sm:hidden mt-6">
          <Link
            href="/rooms"
            className="inline-flex text-xs px-4 py-2 bg-forest-500 hover:bg-forest-600 text-white font-medium tracking-wider uppercase transition-colors"
          >
            View All Rooms
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-2">Around The City</p>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-gray-900">Featured Events</h2>
            <div className="gold-divider w-16 mt-4" />
          </div>
          <Link
            href="/events"
            className="hidden sm:inline-flex text-xs px-4 py-2 bg-forest-500 hover:bg-forest-600 text-white font-medium tracking-wider uppercase transition-colors"
          >
            View All Events
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: HOME_EVENT_LIMIT }).map((_, index) => (
              <SkeletonCard key={`event-skeleton-${index}`} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-ivory-200 px-6 py-16 text-center text-gray-500">
            No events available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} delay={index * 0.06} />
            ))}
          </div>
        )}

        <div className="sm:hidden mt-6">
          <Link
            href="/events"
            className="inline-flex text-xs px-4 py-2 bg-forest-500 hover:bg-forest-600 text-white font-medium tracking-wider uppercase transition-colors"
          >
            View All Events
          </Link>
        </div>
      </div>
    </section>
  );
}
