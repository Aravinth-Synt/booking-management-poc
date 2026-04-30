'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { TourProduct } from '@/types';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80';

function formatDuration(minutes: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SyncBadge({ status }: { status: TourProduct['syncStatus'] }) {
  const map = {
    synced: 'bg-primary-100 text-primary-700 border-primary-200',
    pending: 'bg-sand-100 text-sand-600 border-sand-200',
    error: 'bg-red-50 text-red-600 border-red-200',
  };
  const label = { synced: '✓ Synced', pending: '⏳ Pending', error: '✗ Error' };
  return (
    <span className={`text-xs font-medium text-white px-2 py-0.5 rounded-full border ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function ProductTypeBadge({ type }: { type: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-ocean-500 text-white">
      {type}
    </span>
  );
}

interface TourCardProps {
  tour: TourProduct;
  delay?: number;
}

export default function TourCard({ tour, delay = 0 }: TourCardProps) {
  return (
    <Link
      href={`/booking?productCode=${tour.rezdyCode}`}
      className="tour-card block bg-white rounded-2xl overflow-hidden shadow-sm border border-sand-100 animate-on-load"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative h-48 bg-sand-100 overflow-hidden">
        <Image
          src={tour.imageUrl || FALLBACK_IMAGE}
          alt={tour.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />
        <div className="absolute top-3 left-3">
          <ProductTypeBadge type={tour.productType} />
        </div>
        <div className="absolute top-3 right-3">
          <SyncBadge status={tour.syncStatus} />
        </div>
        {tour.syncStatus === 'error' && (
          <div className="absolute bottom-3 left-3 bg-coral-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Limited availability
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-gray-900 line-clamp-2 mb-1 leading-snug">
          {tour.name}
        </h3>
        <p className="text-sm text-sand-600 line-clamp-2 mb-3 leading-relaxed">
          {tour.shortDescription}
        </p>

        <div className="flex items-center gap-3 text-xs text-sand-500 mb-4">
          {tour.location && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tour.location}
            </span>
          )}
          {tour.durationMinutes > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(tour.durationMinutes)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-sand-400 block">From</span>
            <span className="text-xl font-bold text-primary-600">
              ${tour.price}
              <span className="text-sm font-normal text-sand-400 ml-1">{tour.currency}</span>
            </span>
          </div>
          <div className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Book Now
          </div>
        </div>
      </div>
    </Link>
  );
}
