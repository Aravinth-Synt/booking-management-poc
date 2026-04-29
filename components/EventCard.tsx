"use client";

import Image from "next/image";
import Link from "next/link";
import { Event } from "@/types/events";

const FALLBACK =
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80";

const CATEGORY_STYLE: Record<string, string> = {
  Music: "bg-gold-100 text-gold-700 border-gold-200",
  Sports: "bg-forest-50 text-forest-600 border-forest-200",
  Arts: "bg-ivory-100 text-gray-500 border-ivory-300",
};

interface EventCardProps {
  event: Event;
  delay?: number;
}

export default function EventCard({ event, delay = 0 }: EventCardProps) {
  const hasPrice = Boolean(event.price);

  return (
    <div
      className="bg-white border border-ivory-100 overflow-hidden animate-on-load"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Image */}
      <div className="relative h-52 bg-ivory-100 overflow-hidden">
        <Image
          src={event.image || FALLBACK}
          alt={event.name}
          fill
          className="object-cover"
        />

        {/* Category badge (same place as room category) */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-xs font-medium px-2.5 py-1 border ${
              CATEGORY_STYLE[event.category] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {event.category}
          </span>
        </div>

        {/* Bookmark icon (same place as AC badge) */}
        <div className="absolute top-3 right-3">
          <span className="text-xs font-medium px-2.5 py-1 bg-white/90 border">
            {event.eventType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Date instead of RoomStatus */}
        <div className="mb-3">
          <span className="text-xs text-gray-500">{event.date}</span>
        </div>

        {/* Title */}
        <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
          {event.name}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-3 leading-relaxed">
          {event.description}
        </p>

        {/* Description (use venue + city) */}
        {(event.venueName || event.city || event.state) && (
          <p className="text-sm text-gray-400 mb-3">
            {[event.venueName, event.city, event.state].filter(Boolean).join(", ")}
          </p>
        )}

        {/* Optional: remaining seats */}
        {/* {event.remaining && ( */}
        <div className="mb-4">
          <span className="text-xs px-2 py-1 bg-ivory-50 text-gray-500 border border-ivory-200">
            {event.statusLabel || "On Sale"}
          </span>
        </div>
        {/* )} */}

        {/* Bottom section (same as room price section) */}
        <div className="flex items-end justify-between">
          {hasPrice ? (
            <div>
              <p className="text-xs text-gray-400">Price</p>
              <p className="font-display text-2xl font-semibold text-gray-900">
                {event.price}
              </p>
            </div>
          ) : (
            <div />
          )}

          <Link
            href={`/events/${event.id}`}
            className="text-xs px-4 py-2 bg-forest-500 hover:bg-forest-600 text-white font-medium tracking-wider uppercase transition-colors"
          >
            View Event →
          </Link>
        </div>
      </div>
    </div>
  );
}
