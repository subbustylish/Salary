import React from 'react';
import { AttendanceException, AttendanceRecord, Holiday } from '../../types';
import {
  DAYS_OF_WEEK,
  formatDateToYYYYMMDD,
  formatMinutesToDuration,
  formatTime,
  getCalendarGridDays,
  MONTH_NAMES,
  padZero
} from '../../utils/dateUtils';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';

interface Props {
  year: number;
  month: number;
  records: AttendanceRecord[];
  exceptions: AttendanceException[];
  holidays: Holiday[];
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string | null;
  readonly?: boolean;
}

export const CalendarGrid: React.FC<Props> = ({
  year,
  month,
  records,
  exceptions,
  holidays,
  onSelectDate,
  selectedDate,
  readonly = false
}) => {
  const days = getCalendarGridDays(year, month);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach(r => recordMap.set(r.date, r));

  const exceptionMap = new Map<string, AttendanceException>();
  exceptions.forEach(e => exceptionMap.set(e.date, e));

  const holidayMap = new Map<string, Holiday>();
  holidays.forEach(h => holidayMap.set(h.date, h));

  // Prefix blanks for first week
  const blanks = Array.from({ length: firstDayOfWeek });

  const todayDateStr = formatDateToYYYYMMDD(new Date());

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Calendar header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-base">
          {MONTH_NAMES[month - 1]} {year} Attendance Calendar
        </h3>
        <div className="text-xs text-slate-500 font-medium">
          6-Day Work Week (Sundays & Official Holidays Excluded)
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
        {DAYS_OF_WEEK.map((day, i) => (
          <div
            key={day}
            className={`py-2.5 ${i === 0 ? 'text-rose-600 font-bold bg-rose-50/50' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 border-collapse">
        {/* Leading blanks */}
        {blanks.map((_, i) => (
          <div
            key={`blank-${i}`}
            className="min-h-[96px] border-b border-r border-slate-100 bg-slate-50/30"
          />
        ))}

        {days.map(d => {
          const isSun = d.isSunday;
          const isToday = d.dateStr === todayDateStr;
          const holiday = holidayMap.get(d.dateStr);
          const exception = exceptionMap.get(d.dateStr);
          const record = recordMap.get(d.dateStr);
          const isSelected = selectedDate === d.dateStr;

          let displayStatus: 'present' | 'absent' | 'half_day' | 'permission' | 'wfh' | 'holiday' | 'sunday' | 'not_marked' = 'not_marked';
          let note = '';

          if (isSun) {
            displayStatus = 'sunday';
          } else if (holiday) {
            displayStatus = 'holiday';
            note = holiday.name;
          } else if (exception || record) {
            // If record is present with full working hours (>= 420 mins, e.g. after admin adjustment), prioritize present
            if (record?.status === 'present' && (!exception || record.total_working_minutes >= 420)) {
              displayStatus = 'present';
            } else if (exception?.type === 'wfh' || record?.status === 'wfh') {
              displayStatus = 'wfh';
            } else if (exception?.type === 'permission' || record?.status === 'permission') {
              displayStatus = 'permission';
            } else if (exception?.type === 'half_day' || record?.status === 'half_day') {
              displayStatus = 'half_day';
            } else if (exception?.type === 'absent' || record?.status === 'absent') {
              displayStatus = 'absent';
            } else if (record?.status === 'present') {
              displayStatus = 'present';
            }

            if (exception?.type === 'permission' && exception.permission_minutes) {
              note = `${Math.floor(exception.permission_minutes / 60)}h ${exception.permission_minutes % 60}m`;
            } else if (record && record.total_working_minutes > 0) {
              note = formatMinutesToDuration(record.total_working_minutes);
            } else if (exception?.reason) {
              note = exception.reason;
            }
          }

          return (
            <div
              key={d.dateStr}
              onClick={() => onSelectDate && onSelectDate(d.dateStr)}
              className={`min-h-[105px] p-2 border-b border-r border-slate-100 transition-colors flex flex-col justify-between ${
                isSun
                  ? 'bg-slate-50/80'
                  : holiday
                  ? 'bg-indigo-50/30'
                  : isSelected
                  ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-500'
                  : displayStatus === 'wfh'
                  ? 'bg-sky-50/30 hover:bg-sky-50/60'
                  : 'hover:bg-slate-50/60'
              } ${onSelectDate ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                    isSun
                      ? 'text-rose-600 bg-rose-50'
                      : holiday
                      ? 'text-indigo-700 bg-indigo-100'
                      : isToday
                      ? 'bg-blue-600 text-white font-bold'
                      : isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-800'
                  }`}
                >
                  {d.dayNumber}
                </span>

                {isToday && (
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    TODAY
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-1">
                {holiday ? (
                  <div className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200 truncate" title={`${holiday.name} - ${holiday.description}`}>
                    🎉 {holiday.name}
                  </div>
                ) : (
                  <AttendanceStatusBadge
                    status={displayStatus}
                    missedLogout={record?.missed_logout}
                  />
                )}

                {/* Exact Punches: In & Out (Only shown for working days, NEVER for Absent) */}
                {record && !isSun && !holiday && displayStatus !== 'absent' && (record.login_time || record.logout_time) && (
                  <div className="bg-slate-50/90 rounded border border-slate-100 p-1 text-[10px] font-mono leading-tight space-y-0.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">In:</span>
                      <span className="font-semibold text-slate-800">{formatTime(record.login_time)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Out:</span>
                      <span className={`font-semibold ${record.logout_time ? 'text-slate-800' : 'text-emerald-600'}`}>
                        {record.logout_time ? formatTime(record.logout_time) : (isToday ? 'Active' : '--:--')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Additional working duration (Only for working days, NEVER for Absent) */}
                {record?.total_working_minutes && displayStatus !== 'absent' ? (
                  <div className="text-[10px] text-slate-600 font-mono flex items-center justify-between px-0.5">
                    <span className="text-slate-400">Worked:</span>
                    <span className="font-semibold text-slate-900">
                      {formatMinutesToDuration(record.total_working_minutes)}
                    </span>
                  </div>
                ) : null}

                {exception?.permission_minutes ? (
                  <div className="text-[10px] text-purple-700 font-mono px-0.5">
                    Duration: {formatMinutesToDuration(exception.permission_minutes)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Status Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Half Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Permission</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>WFH (Remote)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Official Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span>Sunday Off</span>
        </div>
      </div>
    </div>
  );
};
