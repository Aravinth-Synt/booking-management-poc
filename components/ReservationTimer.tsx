'use client';

import { useState, useEffect, useRef } from 'react';

interface ReservationTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

const TOTAL_SECONDS = 600;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ReservationTimer({ expiresAt, onExpire }: ReservationTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const hasExpired = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const val = Math.max(0, diff);
      setRemaining(val);
      if (val <= 0 && !hasExpired.current) {
        hasExpired.current = true;
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const pct = Math.min(100, (remaining / TOTAL_SECONDS) * 100);
  const isWarning = remaining <= 120;

  return (
    <div className="space-y-2">
      <div className="w-full h-1.5 bg-ivory-200 rounded-full overflow-hidden">
        <div
          className={`h-full timer-bar rounded-full ${isWarning ? 'bg-crimson-500' : 'bg-forest-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-mono font-semibold ${isWarning ? 'text-crimson-600 animate-timer-warn' : 'text-forest-600'}`}>
          {fmt(remaining)} remaining
        </span>
        {isWarning && (
          <span className="text-xs text-crimson-500 animate-timer-warn font-medium">
            ⚠ Hurry! Reservation expiring soon
          </span>
        )}
      </div>
    </div>
  );
}
