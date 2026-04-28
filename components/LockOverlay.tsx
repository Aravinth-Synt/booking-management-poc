'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { RoomLock } from '@/types';

interface LockOverlayProps {
  lock: RoomLock;
  onRefresh: () => void;
}

function formatWait(seconds: number): string {
  if (seconds <= 0) return 'soon';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function LockOverlay({ lock, onRefresh }: LockOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000);
      const val = Math.max(0, diff);
      setSecondsLeft(val);
      if (val <= 0) { clearInterval(interval); onRefresh(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [lock.expiresAt, onRefresh]);

  return (
    <div className="bg-crimson-50 border border-crimson-200 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-crimson-100 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="h-4 w-4 text-crimson-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-crimson-700">Room Currently Reserved</p>
          <p className="text-xs text-crimson-500 mt-0.5">
            Another guest is completing their booking. Estimated available in{' '}
            <strong>{formatWait(secondsLeft)}</strong>.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRefresh}
          className="flex-1 text-xs font-medium py-2 px-3 border border-crimson-200 text-crimson-600 hover:bg-crimson-100 transition-colors tracking-wide uppercase"
        >
          Refresh Status
        </button>
        <Link
          href="/rooms"
          className="flex-1 text-xs font-medium py-2 px-3 bg-forest-500 hover:bg-forest-600 text-white text-center transition-colors tracking-wide uppercase"
        >
          Choose Another Room
        </Link>
      </div>
    </div>
  );
}
