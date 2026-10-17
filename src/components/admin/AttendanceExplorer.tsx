import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarGrid } from '../common/CalendarGrid';
import { MONTH_NAMES, formatMinutesToDuration, formatTime, formatReadableDate } from '../../utils/dateUtils';
import { AttendanceStatusBadge } from '../common/AttendanceStatusBadge';
import { WorkingHoursBadge } from '../common/WorkingHoursBadge';
import { calculateEmployeeSalaryForMonth, formatCurrency } from '../../utils/salaryCalculator';
import { Clock, Calendar, UserCheck, Search, Filter, Edit2, X, Check, Info } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../../types';

function extractLocalTimeHHMM(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    const h = d.getHours() < 10 ? `0${d.getHours()}` : `${d.getHours()}`;
    const m = d.getMinutes() < 10 ? `0${d.getMinutes()}` : `${d.getMinutes()}`;
    return `${h}:${m}`;
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return '';
}

function constructIsoWithTime(dateStr: string, timeHHMM: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeHHMM.split(':').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0);
  return d.toISOString();
}

export const AttendanceExplorer: React.FC<{ initialEmployeeId?: string }> = ({
  initialEmployeeId
}) => {
  const { users, attendanceRecords, exceptions, holidays, todayDateStr, updateAttendanceRecord } = useApp();

  const currentYearNow = new Date().getFullYear();
  const currentMonthNow = new Date().getMonth() + 1;

  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialEmployeeId || (users.find(u => u.role === 'employee')?.id || users[0]?.id || '')
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNow);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNow);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);

  // Edit attendance state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
  const [editNotes, setEditNotes] = useState('');
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialEmployeeId && users.some(u => u.id === initialEmployeeId)) {
      setSelectedUserId(initialEmployeeId);
    } else if (!selectedUserId || !users.some(u => u.id === selectedUserId)) {
      const defaultEmp = users.find(u => u.role === 'employee') || users[0];
      if (defaultEmp) {
        setSelectedUserId(defaultEmp.id);
      }
    }
  }, [initialEmployeeId, users, selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditInTime(extractLocalTimeHHMM(rec.login_time));
    setEditOutTime(extractLocalTimeHHMM(rec.logout_time));
    setEditStatus(rec.status);
    setEditNotes(rec.notes || '');
    setEditFeedback(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    let newInIso: string | null = null;
    let newOutIso: string | null = null;

    if (editInTime) {
      newInIso = constructIsoWithTime(editingRecord.date, editInTime);
    }
    if (editOutTime) {
      newOutIso = constructIsoWithTime(editingRecord.date, editOutTime);
    }

    let totalMinutes = 0;
    if (editStatus === 'absent') {
      newInIso = null;
      newOutIso = null;
      totalMinutes = 0;
    } else {
      let totalMinutesCalc = editingRecord.total_working_minutes;
      if (newInIso && newOutIso) {
        const start = new Date(newInIso).getTime();
        const end = new Date(newOutIso).getTime();
        totalMinutesCalc = Math.max(0, Math.round((end - start) / 60000));
      }
      totalMinutes = totalMinutesCalc;
    }

    const res = updateAttendanceRecord(editingRecord.id, {
      login_time: newInIso,
      logout_time: newOutIso,
      status: editStatus,
      total_working_minutes: totalMinutes,
      missed_logout: false,
      notes: editNotes.trim()
    });

    if (res.success) {
      setEditFeedback({ type: 'success', message: 'Attendance record updated successfully!' });
      setTimeout(() => {
        setEditingRecord(null);
        setEditFeedback(null);
      }, 900);
    } else {
      setEditFeedback({ type: 'error', message: res.message });
    }
  };

  // Calculate monthly stats for the selected employee
  const stats = selectedUser ? calculateEmployeeSalaryForMonth(
    selectedUser,
    selectedMonth,
    selectedYear,
    attendanceRecords,
    exceptions,
    holidays
  ) : {
    employee_id: '',
    employee_name: '',
    month: selectedMonth,
    year: selectedYear,
    monthly_salary: 0,
    calendar_days: 30,
    sundays_count: 4,
    holidays_count: 0,
    working_days: 26,
    daily_salary: 0,
    present_days: 0,
    absent_days: 0,
    half_days: 0,
    permission_days_under_or_equal_1h: 0,
    permission_days_over_1h: 0,
    wfh_days: 0,
    unmarked_days: 0,
    absent_deduction: 0,
    half_day_deduction: 0,
    permission_deduction: 0,
    total_deductions: 0,
    net_payable_salary: 0,
    effective_working_days: 0
  };

  const monthPrefix = `${selectedYear}-${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}`;

  const records = selectedUser
    ? attendanceRecords
        .filter(r => r.employee_id === selectedUser.id && r.date.startsWith(monthPrefix))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    'present' | 'absent' | 'half_day' | 'permission' | 'wfh' | 'holiday' | null
  >(null);

  // Group detailed days by status for the current employee in the selected month
  const statusDetails = React.useMemo(() => {
    const list: {
      date: string;
      status: 'present' | 'absent' | 'half_day' | 'permission' | 'wfh' | 'holiday';
      label: string;
      loginTime: string | null;
      logoutTime: string | null;
      durationMinutes: number;
      missedLogout?: boolean;
      reason?: string;
      leaveType?: string;
      permissionMinutes?: number;
    }[] = [];

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const empRecordsMap = new Map(records.map(r => [r.date, r]));
    const empExceptionsMap = new Map(
      exceptions.filter(e => e.employee_id === selectedUser.id && e.date.startsWith(monthPrefix)).map(e => [e.date, e])
    );
    const holidayMap = new Map(holidays.map(h => [h.date, h]));

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${monthPrefix}-${d < 10 ? `0${d}` : d}`;
      const dayDate = new Date(selectedYear, selectedMonth - 1, d);
      const isSunday = dayDate.getDay() === 0;

      const hol = holidayMap.get(dayStr);
      const exc = empExceptionsMap.get(dayStr);
      const rec = empRecordsMap.get(dayStr);

      if (isSunday) continue;

      if (hol) {
        list.push({
          date: dayStr,
          status: 'holiday',
          label: hol.name,
          loginTime: null,
          logoutTime: null,
          durationMinutes: 0,
          reason: hol.description
        });
      } else if (exc) {
        const isAbsent = exc.type === 'absent';
        list.push({
          date: dayStr,
          status: exc.type,
          label: exc.type === 'permission' ? 'Permission Time-off' : exc.type === 'half_day' ? 'Half Day' : exc.type === 'wfh' ? 'Work From Home' : 'Absent',
          loginTime: isAbsent ? null : (rec?.login_time || null),
          logoutTime: isAbsent ? null : (rec?.logout_time || null),
          durationMinutes: isAbsent ? 0 : (rec?.total_working_minutes || (exc.permission_minutes || 0)),
          reason: exc.reason,
          leaveType: exc.leave_type,
          permissionMinutes: exc.permission_minutes
        });
      } else if (rec) {
        const isAbsent = rec.status === 'absent';
        list.push({
          date: dayStr,
          status: rec.status,
          label: rec.status === 'present' ? 'Present (In Office)' : rec.status === 'half_day' ? 'Half Day' : rec.status === 'permission' ? 'Permission' : rec.status === 'wfh' ? 'WFH' : 'Absent',
          loginTime: isAbsent ? null : rec.login_time,
          logoutTime: isAbsent ? null : rec.logout_time,
          durationMinutes: isAbsent ? 0 : (rec.total_working_minutes || 0),
          missedLogout: isAbsent ? false : rec.missed_logout,
          reason: rec.notes || (rec.status === 'present' ? 'Regular office working day' : undefined)
        });
      }
    }

    return list;
  }, [selectedYear, selectedMonth, monthPrefix, records, exceptions, holidays, selectedUser.id]);

  const filteredStatusDays = selectedStatusFilter
    ? statusDetails.filter(d => d.status === selectedStatusFilter)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Employee Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-700" />
            Employee Attendance Explorer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect individual punch history, shift duration benchmarks, and calendar status
          </p>
        </div>

        {/* Employee Dropdown & Month Picker */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
            <span className="text-xs text-slate-500 font-medium">Employee:</span>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.employee_id}) - {u.department}
                </option>
              ))}
            </select>
          </div>

          {/* Month / Year */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
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
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Punch Table
            </button>
          </div>
        </div>
      </div>

      {/* Selected Employee Summary Card with Prompt Specific Metrics (Section 7) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Selected Employee Record
            </div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              {selectedUser.name}
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                {selectedUser.employee_id}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {selectedUser.department} · Base Salary: {formatCurrency(selectedUser.monthly_salary)}/mo · {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Working Days in Month
            </span>
            <span className="text-base font-extrabold text-blue-900 font-mono">
              {stats.working_days} Days
            </span>
            <span className="text-[11px] text-slate-400 block">
              {stats.calendar_days} cal - {stats.sundays_count} Sun - {stats.holidays_count} Hol
            </span>
          </div>
        </div>

        {/* Attendance Statistics Grid - Clickable drill-down into detailed days */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 text-xs">
          {/* Present Days Card */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('present')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedStatusFilter === 'present'
                ? 'bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-500'
                : 'bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-100 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-semibold block">Present Days</span>
              <span className="text-[10px] text-emerald-600 font-bold group-hover:underline">View &rarr;</span>
            </div>
            <span className="text-xl font-bold text-emerald-950 font-mono mt-1 block">
              {stats.present_days}
            </span>
            <span className="text-[10px] text-emerald-600">Click for punch logs</span>
          </button>

          {/* Absent Days Card */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('absent')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedStatusFilter === 'absent'
                ? 'bg-rose-100/80 border-rose-400 ring-2 ring-rose-500'
                : 'bg-rose-50/60 hover:bg-rose-100/60 border-rose-100 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-rose-700 font-semibold block">Absent Days</span>
              <span className="text-[10px] text-rose-600 font-bold group-hover:underline">View &rarr;</span>
            </div>
            <span className="text-xl font-bold text-rose-950 font-mono mt-1 block">
              {stats.absent_days}
            </span>
            <span className="text-[10px] text-rose-600">Click for leave reasons</span>
          </button>

          {/* Half Days Card */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('half_day')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedStatusFilter === 'half_day'
                ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-500'
                : 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-100 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-700 font-semibold block">Half Days</span>
              <span className="text-[10px] text-amber-600 font-bold group-hover:underline">View &rarr;</span>
            </div>
            <span className="text-xl font-bold text-amber-950 font-mono mt-1 block">
              {stats.half_days}
            </span>
            <span className="text-[10px] text-amber-600">Click for shift details</span>
          </button>

          {/* Permission Card */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('permission')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedStatusFilter === 'permission'
                ? 'bg-purple-100/80 border-purple-400 ring-2 ring-purple-500'
                : 'bg-purple-50/60 hover:bg-purple-100/60 border-purple-100 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-purple-700 font-semibold block">Permission</span>
              <span className="text-[10px] text-purple-600 font-bold group-hover:underline">View &rarr;</span>
            </div>
            <span className="text-xl font-bold text-purple-950 font-mono mt-1 block">
              {stats.permission_days_over_1h + stats.permission_days_under_or_equal_1h}
            </span>
            <span className="text-[10px] text-purple-600">
              {stats.permission_days_over_1h > 0 ? `${stats.permission_days_over_1h} (>1h)` : 'Click for hours'}
            </span>
          </button>

          {/* WFH Card */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('wfh')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedStatusFilter === 'wfh'
                ? 'bg-sky-100/80 border-sky-400 ring-2 ring-sky-500'
                : 'bg-sky-50/60 hover:bg-sky-100/60 border-sky-100 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sky-700 font-semibold block">WFH Days</span>
              <span className="text-[10px] text-sky-600 font-bold group-hover:underline">View &rarr;</span>
            </div>
            <span className="text-xl font-bold text-sky-950 font-mono mt-1 block">
              {stats.wfh_days}
            </span>
            <span className="text-[10px] text-sky-600">Click for remote tasks</span>
          </button>

          {/* Holidays Card */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('holiday')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              selectedStatusFilter === 'holiday'
                ? 'bg-indigo-100/80 border-indigo-400 ring-2 ring-indigo-500'
                : 'bg-indigo-50/60 hover:bg-indigo-100/60 border-indigo-100 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-indigo-700 font-semibold block">Holidays</span>
              <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">View &rarr;</span>
            </div>
            <span className="text-xl font-bold text-indigo-950 font-mono mt-1 block">
              {stats.holidays_count}
            </span>
            <span className="text-[10px] text-indigo-600">Click for festival names</span>
          </button>
        </div>

        {/* Detailed Breakdown Panel when a status card is clicked */}
        {selectedStatusFilter && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm capitalize">
                  {selectedUser.name} &mdash; {selectedStatusFilter.replace('_', ' ')} Details ({filteredStatusDays.length} {filteredStatusDays.length === 1 ? 'day' : 'days'})
                </span>
                <span className="text-[11px] text-slate-500">
                  in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter(null)}
                className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md font-medium transition-colors"
              >
                Close Details &times;
              </button>
            </div>

            {filteredStatusDays.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
                No recorded {selectedStatusFilter.replace('_', ' ')} days for {selectedUser.name} in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status / Category</th>
                      <th className="py-2.5 px-3">Login Punch</th>
                      <th className="py-2.5 px-3">Logout Punch</th>
                      <th className="py-2.5 px-3">Recorded Duration</th>
                      <th className="py-2.5 px-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStatusDays.map(item => (
                      <tr key={item.date} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <AttendanceStatusBadge
                            status={item.status}
                            subLabel={item.leaveType}
                            missedLogout={item.missedLogout}
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.status === 'absent' ? (
                            <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                          ) : (
                            formatTime(item.loginTime)
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.status === 'absent' ? (
                            <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                          ) : item.missedLogout ? (
                            <span className="text-amber-700 font-semibold font-mono">
                              {formatTime(item.logoutTime)} (Auto)
                            </span>
                          ) : (
                            formatTime(item.logoutTime)
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.status === 'absent'
                            ? '0h 0m'
                            : item.durationMinutes > 0
                            ? formatMinutesToDuration(item.durationMinutes)
                            : item.status === 'holiday'
                            ? 'Gazetted Off'
                            : '0m'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.reason || item.label}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main View Area: Calendar or Table */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          <CalendarGrid
            year={selectedYear}
            month={selectedMonth}
            records={attendanceRecords.filter(r => r.employee_id === selectedUser?.id)}
            exceptions={exceptions.filter(e => e.employee_id === selectedUser?.id)}
            holidays={holidays}
            selectedDate={inspectedDate}
            onSelectDate={date => setInspectedDate(date === inspectedDate ? null : date)}
          />

          {/* Inspected Day Details Drawer */}
          {inspectedDate && (() => {
            const dayRecord = attendanceRecords.find(
              r => r.employee_id === selectedUser?.id && r.date === inspectedDate
            );
            const dayException = exceptions.find(
              e => e.employee_id === selectedUser?.id && e.date === inspectedDate
            );
            const dayHoliday = holidays.find(h => h.date === inspectedDate);

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Attendance Details for {formatReadableDate(inspectedDate)} &mdash; {selectedUser?.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setInspectedDate(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md font-medium"
                  >
                    Close &times;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">Status</span>
                    <span className="font-bold text-slate-800 uppercase block">
                      {dayHoliday
                        ? `Holiday: ${dayHoliday.name}`
                        : dayException
                        ? `${dayException.type} (${dayException.approval_status})`
                        : dayRecord
                        ? dayRecord.status
                        : 'Not Marked'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">Office In / Out</span>
                    <span className="font-mono text-slate-800 font-semibold block">
                      {dayException?.type === 'absent' || dayRecord?.status === 'absent' ? (
                        <span className="text-rose-600 font-sans font-medium">No Punch (Absent)</span>
                      ) : dayRecord?.login_time ? (
                        `In: ${formatTime(dayRecord.login_time)} · Out: ${
                          dayRecord.logout_time
                            ? formatTime(dayRecord.logout_time)
                            : inspectedDate === todayDateStr
                            ? 'Active (In Office)'
                            : '--:--'
                        }`
                      ) : (
                        'No punch recorded'
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">Duration Worked</span>
                    <span className="font-mono text-slate-800 font-bold block">
                      {dayException?.type === 'absent' || dayRecord?.status === 'absent'
                        ? '0h 0m'
                        : dayRecord?.total_working_minutes
                        ? formatMinutesToDuration(dayRecord.total_working_minutes)
                        : dayHoliday
                        ? 'Gazetted Off'
                        : '0h 0m'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block mb-1">Notes / Adjust</span>
                      <span className="text-slate-600 block italic truncate max-w-[140px]">
                        {dayRecord?.notes || dayException?.reason || 'Standard record'}
                      </span>
                    </div>
                    {dayRecord && (
                      <button
                        onClick={() => openEditModal(dayRecord)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Punch
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Office Login</th>
                  <th className="py-3 px-4">Office Logout</th>
                  <th className="py-3 px-4">Total Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Working Hours Benchmark</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No punch records found for this employee in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {r.date}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {r.status === 'absent' ? (
                          <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                        ) : (
                          formatTime(r.login_time)
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {r.status === 'absent' ? (
                          <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                        ) : r.missed_logout ? (
                          <span className="text-amber-700 font-semibold font-mono">
                            {formatTime(r.logout_time)} (Auto)
                          </span>
                        ) : (
                          formatTime(r.logout_time)
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {r.status === 'absent' ? '0h 0m' : formatMinutesToDuration(r.total_working_minutes)}
                      </td>
                      <td className="py-3 px-4">
                        <AttendanceStatusBadge
                          status={r.status}
                          missedLogout={r.missed_logout}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <WorkingHoursBadge
                          minutes={r.total_working_minutes}
                          isActive={r.date === todayDateStr && !r.logout_time && !!r.login_time}
                          isMissedLogout={r.missed_logout}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          Adjust Times
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Attendance Punch Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Adjust Attendance Punch</h3>
                <p className="text-xs text-slate-500">
                  {selectedUser?.name} &bull; {editingRecord.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    editFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {editFeedback.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login Punch (In)
                  </label>
                  <input
                    type="time"
                    value={editInTime}
                    onChange={e => setEditInTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">24h format (HH:MM)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Logout Punch (Out)
                  </label>
                  <input
                    type="time"
                    value={editOutTime}
                    onChange={e => setEditOutTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">24h format (HH:MM)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Status
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="half_day">Half Day</option>
                  <option value="permission">Permission</option>
                  <option value="wfh">Work From Home (WFH)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="e.g. Corrected manual punch time"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
