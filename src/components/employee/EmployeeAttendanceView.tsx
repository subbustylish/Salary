import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMinutesToDuration, formatTime, MONTH_NAMES } from '../../utils/dateUtils';
import { AttendanceStatusBadge } from '../common/AttendanceStatusBadge';
import { WorkingHoursBadge } from '../common/WorkingHoursBadge';
import { Clock, Filter, Calendar, Search } from 'lucide-react';

export const EmployeeAttendanceView: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { currentUser, users, attendanceRecords, todayDateStr } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const targetUser = employeeId ? users.find(u => u.id === employeeId) : currentUser;
  if (!targetUser) return null;

  const monthPrefix = `${selectedYear}-${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}`;

  const records = attendanceRecords
    .filter(r => r.employee_id === targetUser.id && r.date.startsWith(monthPrefix))
    .filter(r => (statusFilter === 'all' ? true : r.status === statusFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Calculate total minutes worked this month
  const totalMinutes = records.reduce((acc, r) => acc + (r.total_working_minutes || 0), 0);
  const avgMinutes = records.length > 0 ? Math.round(totalMinutes / records.length) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-700" />
            Attendance &amp; Working Hours Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified office login, logout timestamps and 8-hour shift compliance
          </p>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Total Working Time</span>
          <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
            {formatMinutesToDuration(totalMinutes)}
          </span>
          <span className="text-[11px] text-slate-400">Recorded this month</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Average Daily Hours</span>
          <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
            {formatMinutesToDuration(avgMinutes)}
          </span>
          <span className="text-[11px] text-slate-400">Target: 8h 0m</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Recorded Shifts</span>
          <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
            {records.length} sessions
          </span>
          <span className="text-[11px] text-slate-400">Active entries</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Selected Period</span>
          <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
          <span className="text-[11px] text-slate-400">Current calendar</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Status:</span>
          <div className="flex items-center gap-1">
            {['all', 'present', 'half_day', 'permission', 'wfh', 'absent'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-2.5 py-1 border border-slate-300 rounded-md text-xs font-medium bg-white"
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
            className="px-2.5 py-1 border border-slate-300 rounded-md text-xs font-medium bg-white"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Office Login</th>
                <th className="py-3 px-4">Office Logout</th>
                <th className="py-3 px-4">Total Duration</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4">Shift Benchmark</th>
                <th className="py-3 px-4">Timestamp Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records found for this period and filter.
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {r.date}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {formatTime(r.login_time)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {r.missed_logout ? (
                        <span className="text-amber-700 font-semibold">
                          {formatTime(r.logout_time)} (Auto)
                        </span>
                      ) : (
                        formatTime(r.logout_time)
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatMinutesToDuration(r.total_working_minutes)}
                    </td>
                    <td className="py-3.5 px-4">
                      <AttendanceStatusBadge
                        status={r.status}
                        missedLogout={r.missed_logout}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <WorkingHoursBadge
                        minutes={r.total_working_minutes}
                        isActive={r.date === todayDateStr && !r.logout_time && !!r.login_time}
                        isMissedLogout={r.missed_logout}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {r.missed_logout
                        ? 'Auto 6:30 PM Logoff'
                        : r.login_time
                        ? 'Automated Punch'
                        : 'System Exception'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
