'use client';

import Image from 'next/image';
import Link from 'next/link';
import RoomStatusBadge from './RoomStatusBadge';
import type { RoomProduct } from '@/types';

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
  guests?: number;
}

export default function RoomCard({ room, delay = 0, checkIn, checkOut, guests }: RoomCardProps) {
  const isBooked = room.status === 'booked';

  const hasSlotData    = room.slotsAvailable !== undefined && room.slotsTotal !== undefined;
  const isFullyBooked  = hasSlotData && room.slotsAvailable === 0;
  const isLastRoom     = hasSlotData && room.slotsAvailable === 1;
  const isLowStock     = hasSlotData && !isLastRoom && room.slotsAvailable! < room.slotsTotal!;

  const roomHref = (() => {
    const params = new URLSearchParams();
    if (checkIn)  params.set('checkIn',  checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests)   params.set('guests',   String(guests));
    const qs = params.toString();
    return qs ? `/rooms/${room.id}?${qs}` : `/rooms/${room.id}`;
  })();

  const visibleAmenities = room.amenities.slice(0, MAX_AMENITY_PILLS);
  const extraCount = room.amenities.length - MAX_AMENITY_PILLS;

  return (
    <Link
      href={roomHref}
      className="room-card block cursor-pointer bg-white border border-ivory-100 overflow-hidden animate-on-load focus:outline-none focus:ring-2 focus:ring-forest-200 focus:ring-offset-2 focus:ring-offset-white"
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
          ) : isFullyBooked ? (
            <span className="text-xs px-4 py-2 bg-crimson-50 text-crimson-600 border border-crimson-200 font-medium cursor-not-allowed">
              Not Available
            </span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              {isLastRoom && (
                <span className="text-xs font-medium text-amber-600">Last room!</span>
              )}
              {isLowStock && (
                <span className="text-xs font-medium text-forest-600">
                  {room.slotsAvailable} of {room.slotsTotal} left
                </span>
              )}
              <span className="text-xs px-4 py-2 bg-forest-500 text-white font-medium tracking-wider uppercase transition-colors">
                View Room →
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
