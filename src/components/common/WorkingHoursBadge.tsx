import React from 'react';
import { getWorkingHoursTier, getWorkingHoursTierLabel, formatMinutesToDuration } from '../../utils/dateUtils';

interface Props {
  minutes: number;
  isActive?: boolean;
  isMissedLogout?: boolean;
}

export const WorkingHoursBadge: React.FC<Props> = ({ minutes, isActive = false, isMissedLogout = false }) => {
  if (isActive) {
    const tier = getWorkingHoursTier(minutes > 0 ? minutes : 1);
    const info = getWorkingHoursTierLabel(tier);
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          {formatMinutesToDuration(Math.max(1, minutes))}
        </span>
        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/60 px-1.5 py-0.5 rounded">
          Live
        </span>
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${info.colorClass}`}>
          {info.label}
        </span>
      </div>
    );
  }

  if (minutes <= 0) {
    return (
      <span className="text-xs text-slate-400 font-mono">
        0h 0m
      </span>
    );
  }

  const tier = getWorkingHoursTier(minutes);
  const info = getWorkingHoursTierLabel(tier);

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono font-medium text-slate-700">
        {formatMinutesToDuration(minutes)}
      </span>
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${info.colorClass}`}>
        {info.label}
      </span>
      {isMissedLogout && (
        <span className="text-[10px] text-amber-800 bg-amber-100/70 border border-amber-300 px-1.5 py-0.5 rounded font-medium">
          Auto 6:30 PM
        </span>
      )}
    </div>
  );
};
