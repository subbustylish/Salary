import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  AlertCircle,
  CheckCircle,
  Palmtree,
  Hourglass,
  ArrowRight,
  TrendingUp,
  Info,
  ShieldAlert,
  Timer,
  Activity,
  Sparkles
} from 'lucide-react';
import {
  formatMinutesToDuration,
  formatTime,
  getWorkingHoursTier,
  getWorkingHoursTierLabel,
  MONTH_NAMES
} from '../../utils/dateUtils';
import { AttendanceStatusBadge } from '../common/AttendanceStatusBadge';
import { WorkingHoursBadge } from '../common/WorkingHoursBadge';
import { calculateEmployeeSalaryForMonth } from '../../utils/salaryCalculator';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const EmployeeDashboard: React.FC<Props> = ({ onNavigateTab }) => {
  const {
    currentUser,
    attendanceRecords,
    exceptions,
    holidays,
    todayDateStr,
    punchLogin,
    punchLogout,
    triggerAutoLogoffForTest,
    getEmployeeLeaveBalance
  } = useApp();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  const [elapsedActiveSeconds, setElapsedActiveSeconds] = useState(0);
  const [forceTimeWindow, setForceTimeWindow] = useState<'auto' | 'before_930' | 'after_930'>('auto');

  if (!currentUser) return null;

  // Real-time 1-second interval
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 9:30 AM login window logic
  const [y, m, d] = todayDateStr.split('-').map(Number);
  const isSunday = new Date(y, m - 1, d).getDay() === 0;
  const holidayToday = holidays.find(h => h.date === todayDateStr);
  const isNonWorkingDay = isSunday || !!holidayToday;

  const currentHour = liveNow.getHours();
  const currentMin = liveNow.getMinutes();
  const isClockPast930 = currentHour > 9 || (currentHour === 9 && currentMin >= 30);

  const isWindowActive =
    forceTimeWindow === 'after_930'
      ? true
      : forceTimeWindow === 'before_930'
      ? false
      : isClockPast930;

  // Find today's record for this employee
  const todayRecord = attendanceRecords.find(
    r => r.employee_id === currentUser.id && r.date === todayDateStr
  );

  const isLoggedIn = !!(todayRecord?.login_time && !todayRecord?.logout_time);
  const isLoggedOut = !!(todayRecord?.login_time && todayRecord?.logout_time);
  const isMissedLogout = !!todayRecord?.missed_logout;

  const canLogin = !isNonWorkingDay && isWindowActive && !isLoggedIn && !isLoggedOut;

  // Real-time active shift seconds calculation
  useEffect(() => {
    if (!isLoggedIn || !todayRecord?.login_time) {
      setElapsedActiveSeconds(0);
      return;
    }

    const startMs = new Date(todayRecord.login_time).getTime();
    const nowMs = liveNow.getTime();
    const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    setElapsedActiveSeconds(diffSec);
  }, [liveNow, isLoggedIn, todayRecord?.login_time]);

  const elapsedActiveMinutes = Math.floor(elapsedActiveSeconds / 60);
  const elapsedHours = Math.floor(elapsedActiveSeconds / 3600);
  const elapsedMins = Math.floor((elapsedActiveSeconds % 3600) / 60);
  const elapsedSecs = elapsedActiveSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const liveStopwatchStr = `${pad(elapsedHours)}:${pad(elapsedMins)}:${pad(elapsedSecs)}`;

  // 8-hour shift goal calculations (8h = 28800s)
  const targetShiftSeconds = 8 * 3600;
  const shiftProgressPercent = Math.min(100, Math.round((elapsedActiveSeconds / targetShiftSeconds) * 100));
  const remainingSeconds = Math.max(0, targetShiftSeconds - elapsedActiveSeconds);
  const remainingHours = Math.floor(remainingSeconds / 3600);
  const remainingMins = Math.floor((remainingSeconds % 3600) / 60);
  const remainingSecs = remainingSeconds % 60;

  // Dynamic real-time date representations
  const dynamicTodayDateStr = liveNow.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const dynamicWeekday = liveNow.toLocaleDateString('en-US', { weekday: 'long' });
  const dynamicFullToday = liveNow.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const dynamicCurrentClock = liveNow.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const handleLoginClick = () => {
    setFeedback(null);
    const bypassCheck = forceTimeWindow === 'after_930';
    const res = punchLogin(currentUser.id, bypassCheck);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleLogoutClick = () => {
    setFeedback(null);
    const res = punchLogout(currentUser.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleSimulateAutoLogoff = () => {
    setFeedback(null);
    const res = triggerAutoLogoffForTest(currentUser.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Dynamic summary metrics for this employee based on current live month and year
  const monthlyStats = calculateEmployeeSalaryForMonth(
    currentUser,
    liveNow.getMonth() + 1,
    liveNow.getFullYear(),
    attendanceRecords,
    exceptions,
    holidays
  );

  // Upcoming holidays
  const upcomingHolidays = holidays
    .filter(h => h.date >= todayDateStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  // Recent attendance logs (last 5 working sessions)
  const recentRecords = attendanceRecords
    .filter(r => r.employee_id === currentUser.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner (clean without salary / payslip details) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Welcome back,
          </span>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {currentUser.name}
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {currentUser.employee_id}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.department} Department · 6-Day Work Week Shift Tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('calendar')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-600" />
            View Attendance Calendar
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Section: Today's Attendance Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900">Today's Office Attendance</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Clock className="w-3 h-3 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                Real-Time Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated biometric &amp; server timestamp attendance record for {dynamicFullToday}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Session Status:</span>
            {isMissedLogout ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Missed Logout Time (Auto Logoff @ 6:30 PM)
              </span>
            ) : isLoggedIn ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Shift Active ({liveStopwatchStr})
              </span>
            ) : isLoggedOut ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Shift Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Not Punched In
              </span>
            )}
          </div>
        </div>

        {/* Live Attendance Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-xs block mb-1">Today's Date</span>
            <span className="text-sm font-bold text-slate-900 block font-mono">{dynamicTodayDateStr}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {dynamicWeekday} {isNonWorkingDay ? '(Non-Working Day)' : '(Working Day)'}
            </span>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-xs block mb-1">Login Time</span>
            <span className="text-sm font-bold text-slate-900 block font-mono">
              {formatTime(todayRecord?.login_time || null)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {todayRecord?.login_time ? 'Automated stamp' : 'Awaiting punch'}
            </span>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-xs block mb-1">Logout Time</span>
            <span className="text-sm font-bold text-slate-900 block font-mono">
              {formatTime(todayRecord?.logout_time || null)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isMissedLogout ? (
                <span className="text-amber-700 font-semibold">Auto Logoff @ 6:30 PM</span>
              ) : todayRecord?.logout_time ? (
                'Completed'
              ) : isLoggedIn ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Currently Active
                </span>
              ) : (
                '--'
              )}
            </span>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-xs block mb-1">Total Working Hours</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 font-mono">
                {isLoggedIn
                  ? `${elapsedHours}h ${elapsedMins}m ${pad(elapsedSecs)}s`
                  : formatMinutesToDuration(todayRecord?.total_working_minutes || 0)}
              </span>
              {isLoggedIn && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded font-semibold animate-pulse">
                  Live
                </span>
              )}
            </div>
            <div className="mt-1">
              <WorkingHoursBadge
                minutes={
                  isLoggedIn ? elapsedActiveMinutes : (todayRecord?.total_working_minutes || 0)
                }
                isActive={isLoggedIn}
                isMissedLogout={isMissedLogout}
              />
            </div>
          </div>
        </div>

        {/* Live Active Shift Stopwatch Tracker (When Logged In) */}
        {isLoggedIn && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-md border border-blue-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Real-Time Active Shift Tracking
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Live second-by-second shift counter synced with biometric login
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Clock className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-slate-300">Clock:</span>
                <span className="font-bold text-white">{dynamicCurrentClock}</span>
              </div>
            </div>

            {/* Stopwatch Big Display & Progress */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <span className="text-xs text-slate-300 font-medium block mb-1">
                  Elapsed Time Today (Hours : Minutes : Seconds)
                </span>
                <div className="flex items-baseline gap-2 font-mono">
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-wider text-white">
                    {liveStopwatchStr}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    LIVE TICKING
                  </span>
                </div>

                {/* Progress bar towards 8 hour target */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>8-Hour Shift Goal</span>
                    <span className="font-mono text-white font-bold">{shiftProgressPercent}% ({elapsedHours}h {elapsedMins}m / 8h)</span>
                  </div>
                  <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        shiftProgressPercent >= 100
                          ? 'bg-emerald-400'
                          : shiftProgressPercent >= 85
                          ? 'bg-emerald-500'
                          : shiftProgressPercent >= 60
                          ? 'bg-amber-400'
                          : 'bg-blue-400'
                      }`}
                      style={{ width: `${shiftProgressPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Punched in: {formatTime(todayRecord?.login_time || null)}</span>
                    <span>
                      {remainingSeconds > 0
                        ? `${remainingHours > 0 ? `${remainingHours}h ` : ''}${remainingMins}m ${remainingSecs}s remaining to 8h completion`
                        : '✓ 8-Hour Full Day Completed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Status Tier</span>
                </div>
                <div className="font-mono text-sm font-bold text-white">
                  {elapsedActiveMinutes >= 480
                    ? 'Completed (>= 8h)'
                    : elapsedActiveMinutes >= 450
                    ? 'Optimal Shift (>= 7.5h)'
                    : elapsedActiveMinutes >= 300
                    ? 'In Progress (Short Tier)'
                    : 'Morning Shift (< 5h)'}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Total salary credits will calculate automatically upon punching out or 6:30 PM shift closing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Big Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* LOGIN BUTTON */}
          <button
            onClick={handleLoginClick}
            disabled={!canLogin}
            className={`py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
              !canLogin
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            <LogIn className="w-5 h-5" />
            <div className="text-left">
              <div className="text-base font-extrabold tracking-wide">
                {isNonWorkingDay
                  ? 'OFFICE CLOSED'
                  : !isWindowActive
                  ? 'OPENS AT 9:30 AM'
                  : 'LOGIN'}
              </div>
              <div className="text-[11px] font-normal opacity-90">
                {isSunday
                  ? 'Sunday off (Non-working day)'
                  : holidayToday
                  ? `Official Holiday: ${holidayToday.name}`
                  : !isWindowActive
                  ? 'Login button activates at 9:30 AM'
                  : isLoggedIn
                  ? 'Session already active'
                  : isLoggedOut
                  ? 'Completed for today'
                  : 'Record official office punch-in'}
              </div>
            </div>
          </button>

          {/* LOGOUT BUTTON */}
          <button
            onClick={handleLogoutClick}
            disabled={!isLoggedIn}
            className={`py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
              !isLoggedIn
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            <LogOut className="w-5 h-5" />
            <div className="text-left">
              <div className="text-base font-extrabold tracking-wide">LOGOUT</div>
              <div className="text-[11px] font-normal opacity-90">
                {!todayRecord?.login_time
                  ? 'Must login first'
                  : isLoggedOut
                  ? 'Already logged out'
                  : 'Punch-out & compute duration'}
              </div>
            </div>
          </button>
        </div>

        {/* 9:30 AM Shift Opening Rule & Window Status */}
        <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
          <div className="flex items-start gap-2 text-blue-950">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Daily 9:30 AM Login Activation Rule:
              </span>
              <span className="text-[11px] text-blue-800 leading-relaxed block">
                Office login is locked before <strong>9:30 AM</strong> and automatically activates at <strong>9:30 AM</strong> on working days (Mon–Sat, excluding Sundays &amp; official holidays).
              </span>
            </div>
          </div>

          {/* Quick simulation controls for review */}
          <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-blue-200">
            <span className="text-[10px] text-slate-500 font-medium px-1">Test Window:</span>
            <button
              onClick={() => setForceTimeWindow('auto')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                forceTimeWindow === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Real Clock
            </button>
            <button
              onClick={() => setForceTimeWindow('before_930')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                forceTimeWindow === 'before_930' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Before 9:30 AM (Locked)
            </button>
            <button
              onClick={() => setForceTimeWindow('after_930')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                forceTimeWindow === 'after_930' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              After 9:30 AM (Active)
            </button>
          </div>
        </div>

        {/* 6:30 PM Auto-Logoff Policy Notice & Test Simulation Trigger (Section 5) */}
        <div className="mt-5 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
          <div className="flex items-start gap-2.5 text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">6:30 PM Auto-Logoff Policy (Missed Logout):</span>
              <span className="text-[11px] text-amber-800 leading-relaxed block">
                If an employee misses logging out, once the time crosses 6:30 PM, the system automatically records 6:30 PM as the logoff timestamp and marks the status as <strong>"Missed Logout Time"</strong>.
              </span>
            </div>
          </div>

          {/* Test button to simulate 6:30 PM auto logoff when user is active */}
          {isLoggedIn && (
            <button
              onClick={handleSimulateAutoLogoff}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors shrink-0 border border-amber-300"
              title="Test the 6:30 PM auto logoff rule"
            >
              Simulate 6:30 PM Auto-Logoff
            </button>
          )}
        </div>

        {/* Working Hours Rules Banner */}
        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Working Hours Benchmark (8h Standard Shift):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-white">
              &ge; 8h Completed / Normal
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              7h - 8h Optimal
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              5h - 7h Short
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
              &lt; 5h Under / Half Day
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Monthly Attendance Summary & Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Summary Cards (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {MONTH_NAMES[liveNow.getMonth()]} {liveNow.getFullYear()} Attendance Summary
              </h3>
              <p className="text-xs text-slate-500">Live statistics computed dynamically</p>
            </div>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              Open Full Calendar &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700 block">Present Days</span>
              <span className="text-xl font-bold text-emerald-900 mt-1 block">
                {monthlyStats.present_days}
              </span>
              <span className="text-[10px] text-emerald-600">Working days attended</span>
            </div>

            <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
              <span className="text-[11px] font-semibold text-rose-700 block">Absent Days</span>
              <span className="text-xl font-bold text-rose-900 mt-1 block">
                {monthlyStats.absent_days}
              </span>
              <span className="text-[10px] text-rose-600">Full-day deduction applied</span>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-700 block">Half Days</span>
              <span className="text-xl font-bold text-amber-900 mt-1 block">
                {monthlyStats.half_days}
              </span>
              <span className="text-[10px] text-amber-600">0.5 day deduction applied</span>
            </div>

            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
              <span className="text-[11px] font-semibold text-purple-700 block">Permissions</span>
              <span className="text-xl font-bold text-purple-900 mt-1 block">
                {monthlyStats.permission_days_over_1h + monthlyStats.permission_days_under_or_equal_1h}
              </span>
              <span className="text-[10px] text-purple-600">
                {monthlyStats.permission_days_over_1h > 0 ? `${monthlyStats.permission_days_over_1h} (>1h deduct)` : 'No deduction'}
              </span>
            </div>
          </div>

          {/* Item 1: Employee Leave Quotas & Remaining Balances Card */}
          {(() => {
            const bal = getEmployeeLeaveBalance(currentUser.id);
            const clLeft = Math.max(0, bal.casual_leave_total - bal.casual_leave_used);
            const slLeft = Math.max(0, bal.sick_leave_total - bal.sick_leave_used);
            return (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block">Casual Leave Balance</span>
                    <span className="text-[11px] text-indigo-700">
                      {bal.casual_leave_used} used of {bal.casual_leave_total} days total
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-indigo-950 block">{clLeft}</span>
                    <span className="text-[10px] font-semibold text-indigo-600">days left</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Sick Leave Balance</span>
                    <span className="text-[11px] text-emerald-700">
                      {bal.sick_leave_used} used of {bal.sick_leave_total} days total
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-emerald-950 block">{slLeft}</span>
                    <span className="text-[10px] font-semibold text-emerald-600">days left</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Upcoming Holidays / Organization Calendar (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Holidays &amp; Festivals</h3>
              </div>
              <button
                onClick={() => onNavigateTab('holidays')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {upcomingHolidays.map(h => (
                <div
                  key={h.id}
                  className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{h.name}</span>
                    <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      {h.date}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{h.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-tight">
            * Official holidays are non-working days and are strictly excluded from attendance deductions.
          </div>
        </div>
      </div>

      {/* Recent Attendance Punch Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-sm">Recent Working Sessions</h3>
          </div>
          <button
            onClick={() => onNavigateTab('my-attendance')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            View Complete History &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Login Time</th>
                <th className="py-2.5 px-3">Logout Time</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Working Hours Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRecords.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                    {r.date}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {formatTime(r.login_time)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {r.missed_logout ? (
                      <span className="text-amber-700 font-semibold font-mono">
                        {formatTime(r.logout_time)} (Auto)
                      </span>
                    ) : (
                      formatTime(r.logout_time)
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-900">
                    {formatMinutesToDuration(r.total_working_minutes)}
                  </td>
                  <td className="py-3 px-3">
                    <AttendanceStatusBadge
                      status={r.status}
                      missedLogout={r.missed_logout}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <WorkingHoursBadge
                      minutes={r.total_working_minutes}
                      isActive={r.date === todayDateStr && isLoggedIn}
                      isMissedLogout={r.missed_logout}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
