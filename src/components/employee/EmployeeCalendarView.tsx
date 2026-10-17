import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarGrid } from '../common/CalendarGrid';
import { MONTH_NAMES, formatReadableDate, formatTime } from '../../utils/dateUtils';
import { CalendarDays, Info } from 'lucide-react';

export const EmployeeCalendarView: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { currentUser, users, attendanceRecords, exceptions, holidays } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);

  const targetUser = employeeId ? users.find(u => u.id === employeeId) : currentUser;
  if (!targetUser) return null;

  const handleSelectDate = (dateStr: string) => {
    setInspectedDate(dateStr);
  };

  const selectedException = exceptions.find(
    e => e.employee_id === targetUser.id && e.date === inspectedDate
  );
  const selectedRecord = attendanceRecords.find(
    r => r.employee_id === targetUser.id && r.date === inspectedDate
  );
  const selectedHoliday = holidays.find(h => h.date === inspectedDate);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-slate-700" />
            Monthly Attendance Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any calendar day to inspect punch records and shift details
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <CalendarGrid
        year={selectedYear}
        month={selectedMonth}
        records={attendanceRecords.filter(r => r.employee_id === targetUser.id)}
        exceptions={exceptions.filter(e => e.employee_id === targetUser.id)}
        holidays={holidays}
        onSelectDate={handleSelectDate}
        selectedDate={inspectedDate}
      />

      {/* Day Details Drawer / Inspector Card */}
      {inspectedDate && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Details for {formatReadableDate(inspectedDate)}
              </h3>
            </div>
            <button
              onClick={() => setInspectedDate(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-1">Status Type</span>
              <span className="font-bold text-slate-800 uppercase block">
                {selectedHoliday
                  ? `Holiday: ${selectedHoliday.name}`
                  : selectedException
                  ? selectedException.type
                  : selectedRecord
                  ? selectedRecord.status
                  : 'No Record'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-1">Office Punches</span>
              <span className="font-mono text-slate-800 font-semibold block">
                {selectedException?.type === 'absent' || selectedRecord?.status === 'absent' ? (
                  <span className="text-rose-600 font-sans font-medium">No Punch (Absent)</span>
                ) : selectedRecord?.login_time ? (
                  `In: ${formatTime(selectedRecord.login_time)} · Out: ${
                    selectedRecord.logout_time
                      ? formatTime(selectedRecord.logout_time)
                      : inspectedDate === new Date().toISOString().split('T')[0]
                      ? 'Active (In Office)'
                      : '--:--'
                  }`
                ) : (
                  'No Punch Timestamps'
                )}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-1">Reason / Note</span>
              <span className="text-slate-700 block italic">
                {selectedException?.reason || selectedHoliday?.description || (selectedRecord?.status === 'present' ? 'Regular working day (Counted towards salary)' : 'Standard attendance')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
