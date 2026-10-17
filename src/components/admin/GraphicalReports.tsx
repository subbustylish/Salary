import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MONTH_NAMES, formatMinutesToDuration } from '../../utils/dateUtils';
import { calculateEmployeeSalaryForMonth, formatCurrency } from '../../utils/salaryCalculator';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Award,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const GraphicalReports: React.FC = () => {
  const { users, attendanceRecords, exceptions, holidays } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const defaultEmp = users.find(u => u.role === 'employee') || users[0];
    return defaultEmp ? defaultEmp.id : '';
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  React.useEffect(() => {
    if (!selectedUserId || !users.some(u => u.id === selectedUserId)) {
      const defaultEmp = users.find(u => u.role === 'employee') || users[0];
      if (defaultEmp) {
        setSelectedUserId(defaultEmp.id);
      }
    }
  }, [users, selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId) || users.find(u => u.role === 'employee') || users[0];

  const stats = selectedUser
    ? calculateEmployeeSalaryForMonth(
        selectedUser,
        selectedMonth,
        selectedYear,
        attendanceRecords,
        exceptions,
        holidays
      )
    : {
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
        permission_days_over_1h: 0,
        permission_days_under_or_equal_1h: 0,
        permission_days_over_3h: 0,
        permission_days_under_or_equal_3h: 0,
        wfh_days: 0,
        unmarked_days: 0,
        absent_deduction: 0,
        half_day_deduction: 0,
        permission_deduction: 0,
        total_deduction: 0,
        net_payable_salary: 0,
        status: 'draft' as const
      };

  const monthPrefix = `${selectedYear}-${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}`;

  // Get daily records for the working hours chart
  const userMonthRecords = selectedUser
    ? attendanceRecords
        .filter(r => r.employee_id === selectedUser.id && r.date.startsWith(monthPrefix))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  // Attendance distribution categories
  const distributionData = [
    { label: 'Present', count: stats.present_days, color: '#10b981', textColor: 'text-emerald-700' },
    { label: 'Absent', count: stats.absent_days, color: '#f43f5e', textColor: 'text-rose-700' },
    { label: 'Half Day', count: stats.half_days, color: '#f59e0b', textColor: 'text-amber-700' },
    {
      label: 'Permission',
      count: stats.permission_days_over_3h + stats.permission_days_under_or_equal_3h,
      color: '#a855f7',
      textColor: 'text-purple-700'
    },
    { label: 'WFH', count: stats.wfh_days, color: '#0ea5e9', textColor: 'text-sky-700' }
  ];

  const totalMarkedEvents = distributionData.reduce((acc, d) => acc + d.count, 0);

  // Compute total hours & punctuality
  const totalMinutes = userMonthRecords.reduce((acc, r) => acc + (r.total_working_minutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const standardHoursTarget = stats.working_days * 8;
  const hoursCompliancePct =
    standardHoursTarget > 0 ? Math.min(100, Math.round((totalHours / standardHoursTarget) * 100)) : 100;

  // Working Hours Daily Chart data (up to days in month)
  const chartDays = userMonthRecords.map(r => {
    const day = r.date.split('-')[2];
    const hrs = Math.round((r.total_working_minutes / 60) * 10) / 10;
    return {
      date: r.date,
      dayLabel: `Oct ${parseInt(day, 10)}`,
      hours: hrs,
      status: r.status
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Dynamic Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            Attendance Analytics &amp; Graphical Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic visual reports for shift compliance, attendance distribution, and working hour trends
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
            <span className="text-xs text-slate-500 font-medium">Employee:</span>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.employee_id})
                </option>
              ))}
            </select>
          </div>

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
        </div>
      </div>

      {/* 4 Attendance Summary KPI Cards (Section 8 Item 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Hours Logged</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block font-mono">
            {totalHours} hrs
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Target: {standardHoursTarget} hrs ({stats.working_days} working days)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Hours Compliance</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-900 mt-2 block font-mono">
            {hoursCompliancePct}%
          </span>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            8-hour benchmark adherence
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Attendance Score</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-black text-indigo-900 mt-2 block font-mono">
            {stats.working_days > 0
              ? `${Math.round(((stats.present_days + stats.wfh_days) / stats.working_days) * 100)}%`
              : '100%'}
          </span>
          <span className="text-[11px] text-indigo-600 mt-1 block">
            {stats.present_days + stats.wfh_days} of {stats.working_days} days worked
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Salary Deductions</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-rose-900 mt-2 block font-mono">
            {formatCurrency(stats.total_deduction)}
          </span>
          <span className="text-[11px] text-rose-600 mt-1 block">
            Net Pay: {formatCurrency(stats.net_payable_salary)}
          </span>
        </div>
      </div>

      {/* Two Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Attendance Distribution (Section 8 Item 1) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Attendance Distribution ({selectedUser.name})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            {/* Visual Multi-segment Bar */}
            <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-100 my-4 border border-slate-200">
              {distributionData.map(item => {
                const pct = totalMarkedEvents > 0 ? (item.count / totalMarkedEvents) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={item.label}
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                    className="h-full transition-all hover:opacity-85"
                    title={`${item.label}: ${item.count} days (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>

            {/* Distribution Legend & Breakdown */}
            <div className="space-y-3 mt-5">
              {distributionData.map(item => {
                const pct = totalMarkedEvents > 0 ? Math.round((item.count / totalMarkedEvents) * 100) : 0;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-slate-800">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono text-slate-500">{pct}%</span>
                      <span className="font-mono font-bold text-slate-900 w-12 text-right">
                        {item.count} {item.count === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Total active working entries: {totalMarkedEvents} days · Sundays &amp; official holidays excluded.
          </div>
        </div>

        {/* Chart 2: Daily Working Hours Chart (Section 8 Item 2) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  2. Working Hours per Session (Target: 8h/day)
                </h3>
              </div>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                8h Target Line
              </span>
            </div>

            {/* SVG Bar Chart */}
            <div className="relative pt-6 pb-2">
              {/* Dotted target line at 8 hours (assuming max height represents 10 hours) */}
              <div className="absolute left-8 right-2 top-[30%] border-t-2 border-dashed border-indigo-400 z-10 flex items-center justify-end">
                <span className="text-[10px] font-bold text-indigo-700 bg-white px-1 -mt-2">
                  Standard 8h Shift
                </span>
              </div>

              {/* Chart container */}
              <div className="h-48 flex items-end gap-3 px-8 pb-4 border-b border-l border-slate-300">
                {chartDays.length === 0 ? (
                  <div className="w-full text-center text-slate-400 text-xs self-center">
                    No punch duration records in this period.
                  </div>
                ) : (
                  chartDays.map(cd => {
                    const maxScaleHours = 10;
                    const heightPct = Math.min(100, Math.max(8, (cd.hours / maxScaleHours) * 100));
                    const isOver8 = cd.hours >= 8;
                    const isOver7 = cd.hours >= 7;
                    const isOver5 = cd.hours >= 5;

                    const barColor = isOver8
                      ? 'bg-slate-900 hover:bg-slate-800'
                      : isOver7
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : isOver5
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-rose-500 hover:bg-rose-600';

                    return (
                      <div
                        key={cd.date}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded font-mono pointer-events-none whitespace-nowrap z-20 shadow-lg">
                          {cd.dayLabel}: {cd.hours} hrs ({cd.status})
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[28px] rounded-t-md transition-all ${barColor}`}
                        />

                        {/* X-axis label */}
                        <span className="text-[10px] text-slate-500 font-mono mt-1 whitespace-nowrap">
                          {cd.dayLabel.split(' ')[1]}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Benchmark Legend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-2 px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-900" />
                <span>&ge; 8h Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>7h - 8h Green</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                <span>5h - 7h Short</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                <span>&lt; 5h Under</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Working hours rules: Shifts below 5h trigger half-day deductions or alert review.
          </div>
        </div>
      </div>

      {/* Chart 3: Monthly Attendance Trend (Section 8 Item 3) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              3. Monthly Attendance Timeline &amp; Consistency Trend
            </h3>
          </div>
          <span className="text-xs text-slate-500">October 2026 Session Walkthrough</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {chartDays.map(d => (
            <div
              key={d.date}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center"
            >
              <span className="text-[11px] font-bold text-slate-700 block font-mono">
                {d.dayLabel}
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block font-mono">
                {d.hours}h
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded mt-1 inline-block capitalize ${
                  d.status === 'present'
                    ? 'bg-emerald-50 text-emerald-700'
                    : d.status === 'wfh'
                    ? 'bg-sky-50 text-sky-700'
                    : d.status === 'half_day'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-purple-50 text-purple-700'
                }`}
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
