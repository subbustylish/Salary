import React from 'react';
import { AttendanceStatus } from '../../types';

interface Props {
  status: AttendanceStatus | 'holiday' | 'sunday' | 'not_marked';
  subLabel?: string;
  missedLogout?: boolean;
}

export const AttendanceStatusBadge: React.FC<Props> = ({ status, subLabel, missedLogout }) => {
  if (missedLogout) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title="Present (Auto logoff triggered at 6:30 PM)">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Present <span className="font-medium text-[10px] text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-300">Auto Out</span>
      </span>
    );
  }

  switch (status) {
    case 'present':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Present {subLabel && <span className="font-normal opacity-80 text-[10px]">({subLabel})</span>}
        </span>
      );
    case 'absent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Absent {subLabel && <span className="font-normal opacity-80 text-[10px]">({subLabel})</span>}
        </span>
      );
    case 'half_day':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Half Day {subLabel && <span className="font-normal opacity-80 text-[10px]">({subLabel})</span>}
        </span>
      );
    case 'permission':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Permission {subLabel && <span className="font-normal opacity-80 text-[10px]">({subLabel})</span>}
        </span>
      );
    case 'wfh':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          WFH {subLabel && <span className="font-normal opacity-80 text-[10px]">({subLabel})</span>}
        </span>
      );
    case 'holiday':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Holiday {subLabel && <span className="font-normal opacity-80 text-[10px]">({subLabel})</span>}
        </span>
      );
    case 'sunday':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          Sunday Off
        </span>
      );
    case 'not_marked':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-normal bg-slate-50 text-slate-400 border border-slate-200">
          Not Marked
        </span>
      );
  }
};
