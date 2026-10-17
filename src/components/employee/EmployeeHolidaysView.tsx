import React from 'react';
import { useApp } from '../../context/AppContext';
import { Palmtree, Calendar, Sparkles } from 'lucide-react';
import { formatReadableDate } from '../../utils/dateUtils';

export const EmployeeHolidaysView: React.FC = () => {
  const { holidays, todayDateStr } = useApp();

  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Organization Holidays &amp; Festivals</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official recognized company holidays · Excluded from working day salary deductions
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedHolidays.map(h => {
          const isPast = h.date < todayDateStr;
          const isToday = h.date === todayDateStr;
          const [year, month, day] = h.date.split('-').map(Number);
          const d = new Date(year, month - 1, day);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

          return (
            <div
              key={h.id}
              className={`p-5 rounded-2xl border transition-all ${
                isToday
                  ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500'
                  : isPast
                  ? 'bg-slate-50/60 border-slate-200 opacity-75'
                  : 'bg-white border-slate-200 shadow-xs hover:border-indigo-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mb-2">
                    {h.date}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{h.name}</h3>
                  <span className="text-xs text-slate-500 block mt-0.5">{dayName}</span>
                </div>
                {isToday && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                    TODAY
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">{h.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Working Day Impact:</span>
                <span className="font-semibold text-emerald-700">0% Deduction (Paid Off)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
