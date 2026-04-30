'use client';

import Image from 'next/image';
import Link from 'next/link';
import RoomStatusBadge from './RoomStatusBadge';
import type { RoomProduct } from '@/types';
import { isEffectivelyLocked } from '@/types';

const FALLBACK = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';
const MAX_AMENITY_PILLS = 4;

const CATEGORY_STYLE: Record<string, string> = {
  LUXURY:   'bg-gold-100 text-gold-700 border-gold-200',
  MODERATE: 'bg-forest-50 text-forest-600 border-forest-200',
  BUDGET:   'bg-ivory-100 text-gray-500 border-ivory-300',
};

interface RoomCardProps {
  room: RoomProduct;
  delay?: number;
  checkIn?: string;
  checkOut?: string;
}

export default function RoomCard({ room, delay = 0, checkIn, checkOut }: RoomCardProps) {
  const isLocked      = room.lockStatus === 'locked';
  const isBooked      = room.status === 'booked';
  const isUnavailable = isLocked && isEffectivelyLocked(room.dateConflict);
  const roomHref      = checkIn && checkOut
    ? `/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`
    : `/rooms/${room.id}`;
  const visibleAmenities = room.amenities.slice(0, MAX_AMENITY_PILLS);
  const extraCount = room.amenities.length - MAX_AMENITY_PILLS;

  return (
    <div
      className="room-card bg-white border border-ivory-100 overflow-hidden animate-on-load"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative h-52 bg-ivory-100 overflow-hidden">
        <Image
          src={room.images[0] || FALLBACK}
          alt={room.name}
          fill
          className="object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
        />
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-medium px-2.5 py-1 border ${CATEGORY_STYLE[room.category] ?? ''}`}>
            {room.category}
          </span>
        </div>
        {room.amenity === 'AC' && (
          <div className="absolute top-3 right-3">
            <span className="text-xs font-medium px-2.5 py-1 bg-white/90 text-forest-600 border border-forest-200">
              AC
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3">
          <RoomStatusBadge status={room.lockStatus ?? 'available'} />
        </div>

        <p className="text-xs text-gray-400 mb-1">Floor {room.floor} · Room {room.roomNumber}</p>
        <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">{room.name}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-3 leading-relaxed">{room.description}</p>

        {visibleAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {visibleAmenities.map((a) => (
              <span key={a} className="text-xs px-2 py-0.5 bg-ivory-50 text-gray-500 border border-ivory-200">
                {a}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-xs px-2 py-0.5 text-gray-400">+{extraCount} more</span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400">From</p>
            <p className="font-display text-2xl font-semibold text-gray-900">
              £{room.pricePerNight}
              <span className="text-xs font-body font-normal text-gray-400 ml-1">/ night</span>
            </p>
          </div>

          {isBooked ? (
            <span className="text-xs px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 font-medium">
              Unavailable
            </span>
          ) : isUnavailable ? (
            <span
              title={room.dateConflict === true ? 'Room is being checked out for your selected dates' : 'Checkout in progress'}
              className="text-xs px-4 py-2 bg-crimson-50 text-crimson-600 border border-crimson-200 font-medium cursor-not-allowed"
            >
              {room.dateConflict === true ? 'Not Available' : 'Checkout in Progress'}
            </span>
          ) : (
            <Link
              href={roomHref}
              className="text-xs px-4 py-2 bg-forest-500 hover:bg-forest-600 text-white font-medium tracking-wider uppercase transition-colors"
            >
              View Room →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
