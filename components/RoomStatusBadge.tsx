import type { LockStatus } from '@/types';

interface RoomStatusBadgeProps {
  status: LockStatus | 'available';
  secondsRemaining?: number;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function RoomStatusBadge({ status, secondsRemaining }: RoomStatusBadgeProps) {
  if (status === 'locked') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-crimson-50 text-crimson-600 border border-crimson-200 animate-lock-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-crimson-500" />
        Reserved{secondsRemaining != null ? ` (${formatCountdown(secondsRemaining)} remaining)` : ''}
      </span>
    );
  }
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-500 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        ✓ Booked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Available
    </span>
  );
}
