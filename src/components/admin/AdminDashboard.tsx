import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Clock3,
  Home,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Palmtree,
  Wallet,
  Activity,
  Bell
} from 'lucide-react';
import { formatMinutesToDuration, formatTime } from '../../utils/dateUtils';
import { AttendanceStatusBadge } from '../common/AttendanceStatusBadge';
import { WorkingHoursBadge } from '../common/WorkingHoursBadge';
import { formatCurrency } from '../../utils/salaryCalculator';

interface Props {
  onNavigateTab: (tab: string, employeeId?: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigateTab }) => {
  const { users, attendanceRecords, exceptions, holidays, todayDateStr } = useApp();
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalEmployees = users.length;
  const activeEmployees = users.filter(u => u.status === 'active');
  const inactiveEmployees = users.filter(u => u.status === 'inactive');

  // Today's records
  const todayRecords = attendanceRecords.filter(r => r.date === todayDateStr);
  const todayExceptions = exceptions.filter(e => e.date === todayDateStr);

  // Group today's employee details by status
  const todayEmployeeDetails = React.useMemo(() => {
    return users.map(u => {
      const record = todayRecords.find(r => r.employee_id === u.id);
      const exception = todayExceptions.find(e => e.employee_id === u.id);
      const isActive = !!(record?.login_time && !record?.logout_time);

      let liveWorkingMinutes = record?.total_working_minutes || 0;
      if (isActive && record?.login_time) {
        const startMs = new Date(record.login_time).getTime();
        liveWorkingMinutes = Math.max(1, Math.floor((liveNow.getTime() - startMs) / 60000));
      }

      let status: 'present' | 'absent' | 'half_day' | 'permission' | 'wfh' | 'not_marked' = 'not_marked';
      if (record?.status === 'present' && (!exception || record.total_working_minutes >= 420)) {
        status = 'present';
      } else if (exception?.type === 'wfh' || record?.status === 'wfh') {
        status = 'wfh';
      } else if (exception?.type === 'permission' || record?.status === 'permission') {
        status = 'permission';
      } else if (exception?.type === 'half_day' || record?.status === 'half_day') {
        status = 'half_day';
      } else if (exception?.type === 'absent' || record?.status === 'absent') {
        status = 'absent';
      } else if (record?.status) {
        status = record.status;
      } else if (exception) {
        status = exception.type;
      }

      let reason = exception?.reason || record?.notes;
      if (!reason && status === 'present') {
        reason = 'Active office working shift';
      }

      return {
        user: u,
        record,
        exception,
        status,
        isActive,
        liveWorkingMinutes,
        reason
      };
    });
  }, [users, todayRecords, todayExceptions, liveNow]);

  const presentToday = todayEmployeeDetails.filter(d => d.status === 'present').length;
  const absentToday = todayEmployeeDetails.filter(d => d.status === 'absent').length;
  const halfDayToday = todayEmployeeDetails.filter(d => d.status === 'half_day').length;
  const permissionToday = todayEmployeeDetails.filter(d => d.status === 'permission').length;
  const wfhToday = todayEmployeeDetails.filter(d => d.status === 'wfh').length;

  const totalWorkingMinutesToday = todayRecords.reduce(
    (acc, r) => acc + (r.total_working_minutes || 0),
    0
  );

  const [selectedDashboardFilter, setSelectedDashboardFilter] = useState<
    'staff' | 'present' | 'absent' | 'half_day' | 'permission' | 'wfh' | null
  >(null);

  const filteredEmployeesForModal = selectedDashboardFilter
    ? todayEmployeeDetails.filter(item => {
        if (selectedDashboardFilter === 'staff') return true;
        return item.status === selectedDashboardFilter;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Executive Overview · 6-Day Work Week System
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            Z&amp;T Administration Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active monitoring of attendance punches, working hours benchmarks, and shift rosters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('admin-attendance')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            Attendance Explorer
          </button>
        </div>
      </div>

      {/* High-Level KPI Cards (Section 7) - Clickable for full details */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Employees */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('staff')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
            selectedDashboardFilter === 'staff'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500'
              : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
            {totalEmployees}
          </span>
          <span className="text-[10px] text-slate-400 block group-hover:underline">
            {activeEmployees.length} active · View all &rarr;
          </span>
        </button>

        {/* Present Today */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('present')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
            selectedDashboardFilter === 'present'
              ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500'
              : 'bg-white hover:bg-emerald-50/60 border-slate-200 shadow-xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700">Present</span>
            <UserCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-black text-emerald-900 mt-1 block font-mono">
            {presentToday}
          </span>
          <span className="text-[10px] text-emerald-600 block group-hover:underline">
            In office · Details &rarr;
          </span>
        </button>

        {/* Absent Today */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('absent')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
            selectedDashboardFilter === 'absent'
              ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500'
              : 'bg-white hover:bg-rose-50/60 border-slate-200 shadow-xs hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700">Absent</span>
            <UserX className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-black text-rose-900 mt-1 block font-mono">
            {absentToday}
          </span>
          <span className="text-[10px] text-rose-600 block group-hover:underline">
            Full deduction · Details &rarr;
          </span>
        </button>

        {/* Half Day */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('half_day')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
            selectedDashboardFilter === 'half_day'
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500'
              : 'bg-white hover:bg-amber-50/60 border-slate-200 shadow-xs hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700">Half Day</span>
            <Clock3 className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-black text-amber-900 mt-1 block font-mono">
            {halfDayToday}
          </span>
          <span className="text-[10px] text-amber-600 block group-hover:underline">
            0.5 deduction · Details &rarr;
          </span>
        </button>

        {/* Permission */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('permission')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
            selectedDashboardFilter === 'permission'
              ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-500'
              : 'bg-white hover:bg-purple-50/60 border-slate-200 shadow-xs hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-700">Permission</span>
            <Clock className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-black text-purple-900 mt-1 block font-mono">
            {permissionToday}
          </span>
          <span className="text-[10px] text-purple-600 block group-hover:underline">
            Time-off · Details &rarr;
          </span>
        </button>

        {/* WFH */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('wfh')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
            selectedDashboardFilter === 'wfh'
              ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-500'
              : 'bg-white hover:bg-sky-50/60 border-slate-200 shadow-xs hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-700">WFH</span>
            <Home className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-black text-sky-900 mt-1 block font-mono">
            {wfhToday}
          </span>
          <span className="text-[10px] text-sky-600 block group-hover:underline">
            Remote shift · Details &rarr;
          </span>
        </button>

        {/* On Leave */}
        <button
          type="button"
          onClick={() => setSelectedDashboardFilter('absent')}
          className="bg-white hover:bg-indigo-50/60 p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700">On Leave</span>
            <Palmtree className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-black text-indigo-900 mt-1 block font-mono">
            {absentToday + halfDayToday}
          </span>
          <span className="text-[10px] text-indigo-600 block group-hover:underline">
            Total off-duty · View &rarr;
          </span>
        </button>

        {/* Total Working Hours */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700">Hours Today</span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-base font-black text-slate-900 mt-1 block font-mono">
            {formatMinutesToDuration(totalWorkingMinutesToday)}
          </span>
          <span className="text-[10px] text-slate-400">Total logged</span>
        </div>
      </div>

      {/* Interactive Detail Drawer for Admin Dashboard */}
      {selectedDashboardFilter && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm capitalize">
                Today's {selectedDashboardFilter.replace('_', ' ')} Employees ({filteredEmployeesForModal.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {liveNow.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDashboardFilter(null)}
              className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md font-medium transition-colors"
            >
              Close Details &times;
            </button>
          </div>

          {filteredEmployeesForModal.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
              No employees currently marked as {selectedDashboardFilter.replace('_', ' ')} today.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Login Punch</th>
                    <th className="py-2.5 px-3">Logout Punch</th>
                    <th className="py-2.5 px-3">Duration Today</th>
                    <th className="py-2.5 px-3">Reason / Details</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployeesForModal.map(item => (
                    <tr key={item.user.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.user.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.user.employee_id}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.user.department}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {item.status === 'absent' ? (
                          <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                        ) : (
                          formatTime(item.record?.login_time || null)
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {item.status === 'absent' ? (
                          <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                        ) : item.record?.missed_logout ? (
                          <span className="text-amber-700 font-semibold font-mono">
                            {formatTime(item.record.logout_time)} (Auto)
                          </span>
                        ) : (
                          formatTime(item.record?.logout_time || null)
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <WorkingHoursBadge
                          minutes={item.liveWorkingMinutes}
                          isActive={item.isActive}
                          isMissedLogout={item.record?.missed_logout}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                        {item.reason || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedDashboardFilter(null);
                            onNavigateTab('admin-attendance', item.user.id);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          View Calendar &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('admin-attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">Attendance Explorer</h3>
          <p className="text-xs text-slate-500 mt-1">
            Explore daily login/logout timestamps, shift durations, and employee attendance records.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('employees')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">Employee &amp; Leave Quotas</h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage employees, editable Casual &amp; Sick leave quotas, balances, and passwords.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('notifications')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">Notifications &amp; Alerts</h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure higher management email IDs and WhatsApp hotline numbers for instant alerts.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('analytics')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">Graphical Analytics &amp; Reports</h3>
          <p className="text-xs text-slate-500 mt-1">
            View attendance distribution donuts, 8-hour shift compliance charts, and monthly trend graphs.
          </p>
        </div>
      </div>

      {/* Today's Employee Punch Board */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Today's Employee Attendance Roster</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-500">
              Live real-time punch board for {liveNow.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {liveNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Tracking Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">ID &amp; Department</th>
                <th className="py-3 px-4">Login Time</th>
                <th className="py-3 px-4">Logout Time</th>
                <th className="py-3 px-4">Duration Today</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const record = todayRecords.find(r => r.employee_id === u.id);
                const exception = todayExceptions.find(e => e.employee_id === u.id);
                const isActive = !!(record?.login_time && !record?.logout_time);

                let liveWorkingMinutes = record?.total_working_minutes || 0;
                if (isActive && record?.login_time) {
                  const startMs = new Date(record.login_time).getTime();
                  liveWorkingMinutes = Math.max(1, Math.floor((liveNow.getTime() - startMs) / 60000));
                }

                let statusDisplay: any = record?.status || (exception ? exception.type : 'not_marked');
                if (u.status === 'inactive') {
                  statusDisplay = 'not_marked';
                }

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-slate-700 block">{u.employee_id}</span>
                      <span className="text-[11px] text-slate-500">{u.department}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {statusDisplay === 'absent' ? (
                        <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                      ) : (
                        formatTime(record?.login_time || null)
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {statusDisplay === 'absent' ? (
                        <span className="text-slate-400 font-sans italic text-[11px]">No punch</span>
                      ) : record?.missed_logout ? (
                        <span className="text-amber-700 font-semibold font-mono">
                          {formatTime(record?.logout_time || null)} (Auto)
                        </span>
                      ) : (
                        formatTime(record?.logout_time || null)
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <WorkingHoursBadge
                        minutes={liveWorkingMinutes}
                        isActive={isActive}
                        isMissedLogout={record?.missed_logout}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      {u.status === 'inactive' ? (
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      ) : (
                        <AttendanceStatusBadge
                          status={statusDisplay}
                          missedLogout={record?.missed_logout}
                        />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateTab('admin-attendance', u.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
