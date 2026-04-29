'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import type { Event } from '@/types/events';

const FALLBACK = 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80';

const CATEGORY_STYLE: Record<string, string> = {
  Music: 'bg-gold-100 text-gold-700 border-gold-200',
  Sports: 'bg-forest-50 text-forest-600 border-forest-200',
  Culture: 'bg-ivory-100 text-gray-500 border-ivory-300',
};

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function SkeletonPage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="skeleton h-[50vh] min-h-[320px] w-full mb-10" />
        <div className="skeleton h-10 w-72 mb-4 rounded" />
        <div className="skeleton h-4 w-48 mb-2 rounded" />
        <div className="skeleton h-4 w-full mb-2 rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        const data = await res.json();

        if (!active) return;

        if (!res.ok) {
          setError(data.error ?? 'Unable to load event details.');
          setEvent(null);
          return;
        }

        setEvent(data.event ?? null);
        setError('');
      } catch {
        if (!active) return;
        setError('Unable to load event details.');
        setEvent(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchEvent();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <SkeletonPage />;

  if (!event) {
    return (
      <div className="min-h-screen bg-ivory-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-600 mb-3">Event</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900 mb-4">Event not found</h1>
          <p className="text-gray-500 mb-8">{error || 'We could not find this event.'}</p>
          <Link
            href="/events"
            className="inline-flex px-5 py-3 bg-forest-500 hover:bg-forest-600 text-white text-sm font-medium tracking-wider uppercase transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden mb-10 bg-ivory-200">
          <Image src={event.image || FALLBACK} alt={event.name} fill className="object-cover" priority />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`text-xs font-medium px-3 py-1 border ${CATEGORY_STYLE[event.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {event.category}
            </span>
            {event.eventType && (
              <span className="text-xs font-medium px-3 py-1 border bg-white/80 text-gray-700 border-ivory-200">
                {event.statusLabel?.toUpperCase() || event.eventType.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <p className="text-xs text-gray-400 tracking-wider mb-2 font-semibold">Event Date: {event.eventDate}</p>
            <h1 className="font-display text-4xl font-semibold text-gray-900">{event.name}</h1>
            <div className="gold-divider w-12 mt-4 mb-8" />
            <p className="text-gray-500 leading-relaxed text-lg">{event.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {event.venueName && (
                <div className="bg-white border border-ivory-200 p-4">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Venue</p>
                  <p className="text-sm text-gray-700">{event.venueName}</p>
                </div>
              )}
              {(event.city || event.state || event.country) && (
                <div className="bg-white border border-ivory-200 p-4">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Location</p>
                  <p className="text-sm text-gray-700">{[event.city, event.state, event.country].filter(Boolean).join(', ')}</p>
                </div>
              )}
              {event.statusLabel && (
                <div className="bg-white border border-ivory-200 p-4">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Status</p>
                  <p className="text-sm text-gray-700">{event.statusLabel.toUpperCase()}</p>
                </div>
              )}
              {(event.genre || event.subGenre) && (
                <div className="bg-white border border-ivory-200 p-4">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Category</p>
                  <p className="text-sm text-gray-700">{[event.genre, event.subGenre].filter(Boolean).join(' / ')}</p>
                </div>
              )}
              {event.saleStart && (
                <div className="bg-white border border-ivory-200 p-4">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Sales Start</p>
                  <p className="text-sm text-gray-700">{formatDateTime(event.saleStart)}</p>
                </div>
              )}
              {event.saleEnd && (
                <div className="bg-white border border-ivory-200 p-4">
                  <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Sales End</p>
                  <p className="text-sm text-gray-700">{formatDateTime(event.saleEnd)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-ivory-200 p-6 self-start sticky top-24 space-y-5">
            {event.price && (
              <div>
                <p className="text-xs text-gray-400 tracking-wider uppercase">Price</p>
                <p className="font-display text-3xl font-semibold text-gray-900 mt-1">{event.price}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 tracking-wider uppercase mb-1">Availability</p>
              <p className="text-sm text-gray-600">{event.statusLabel?.toUpperCase() || 'Available'}</p>
            </div>

            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 text-center text-sm font-medium tracking-wider uppercase border border-forest-500 text-forest-600 hover:bg-forest-50 transition-colors"
              >
                Open Ticket Link
              </a>
            )}

            <Link
              href="/events"
              className="block w-full py-3 text-center text-sm font-medium tracking-wider uppercase bg-forest-500 hover:bg-forest-600 text-white transition-colors"
            >
              Browse More Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
