import React from 'react';
import { ShieldAlert, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  DAILY_READ_LIMIT,
  DAILY_WRITE_LIMIT,
  getTimeUntilMidnightPT
} from '../../lib/circuitBreaker';

export const QuotaLockBanner: React.FC = () => {
  const { isQuotaLocked, quotaState } = useApp();

  if (!isQuotaLocked) return null;

  const remainingTime = getTimeUntilMidnightPT();

  return (
    <div
      role="alert"
      className="bg-rose-600 text-white px-4 py-2.5 border-b border-rose-700 shadow-sm z-50"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-100 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-bold tracking-tight">
              Daily 50K limit reached — paused until midnight PT
            </span>
            <span className="hidden md:inline text-rose-100 ml-2">
              All Firestore reads, uploads, and writes are blocked across all browsers to protect your database quota. Cached dashboard data remains viewable.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono bg-rose-700/70 px-2.5 py-1 rounded border border-rose-500/50">
          <span>
            Reads: {quotaState.readUnits.toLocaleString()} / {DAILY_READ_LIMIT.toLocaleString()}
          </span>
          <span className="text-rose-300">|</span>
          <span>
            Writes: {quotaState.writeUnits.toLocaleString()} / {DAILY_WRITE_LIMIT.toLocaleString()}
          </span>
          <span className="text-rose-300 hidden xs:inline">|</span>
          <span className="hidden xs:inline-flex items-center gap-1 text-rose-100 font-sans">
            <Clock className="w-3 h-3" />
            Resets in {remainingTime}
          </span>
        </div>
      </div>
    </div>
  );
};
