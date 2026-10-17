import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  LogOut,
  Menu
} from 'lucide-react';

interface Props {
  onToggleMobileNav: () => void;
}

export const Header: React.FC<Props> = ({ onToggleMobileNav }) => {
  const { currentUser, logoutCurrentUser, isFirestoreConnected } = useApp();
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      );
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Left: Mobile hamburger + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileNav}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-white text-base tracking-wider shadow-xs">
              Z&amp;T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm tracking-tight">
                  Z&amp;T Salary Dashboard
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-500 hidden md:block leading-none">
                Attendance, Hours &amp; Dynamic Payroll System
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Date & Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
          <span className="font-medium text-slate-700 hidden md:inline">{currentDateStr || 'Today'}</span>
          <span className="text-slate-300 hidden md:inline">|</span>
          <span className="font-mono font-bold text-slate-900">{currentTimeStr}</span>
          <span className="hidden xs:inline-flex text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
            Live
          </span>
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Firestore Live Sync Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 text-emerald-800 text-xs font-semibold"
            title="Real-time multi-device database active on Firebase Firestore"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Firestore Live</span>
            <span className="xs:hidden">Live</span>
          </div>

          {/* Logged-in User Badge */}
          <div className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                {currentUser?.name}
                {currentUser?.role === 'admin' ? (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded font-semibold">
                    Admin
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1 rounded font-medium">
                    Emp
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 leading-none">
                {currentUser?.employee_id} · {currentUser?.department}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logoutCurrentUser}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium transition-colors cursor-pointer"
            title="Sign out of your account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>
    </>
  );
};
