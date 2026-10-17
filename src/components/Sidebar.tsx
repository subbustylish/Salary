import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  FileText,
  Palmtree,
  Wallet,
  Users,
  BarChart3,
  ShieldAlert,
  ClipboardList,
  Sparkles,
  LogOut,
  SlidersHorizontal,
  Bell
} from 'lucide-react';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile
}) => {
  const { currentUser, logoutCurrentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const employeeNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-attendance', label: 'My Attendance', icon: Clock },
    { id: 'calendar', label: 'Attendance Calendar', icon: CalendarDays },
    { id: 'requests', label: 'Leave / Permission / WFH', icon: FileText },
    { id: 'holidays', label: 'Holidays & Festivals', icon: Palmtree }
  ];

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees & Leave Quota', icon: Users },
    { id: 'admin-attendance', label: 'Attendance Explorer', icon: Clock },
    { id: 'notifications', label: 'Notification & Alerts', icon: Bell },
    { id: 'analytics', label: 'Graphical Reports', icon: BarChart3 },
    { id: 'holidays', label: 'Holiday Management', icon: Palmtree },
    { id: 'salary', label: 'Salary Management', icon: Wallet },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert }
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* User Mode Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Active Portal
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-slate-900">
                {isAdmin ? 'Administration Portal' : 'Employee Portal'}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isAdmin ? 'ADMIN' : 'STAFF'}
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Navigation
            </span>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick tips card */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              6-Day Work Week Rule
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Organization follows Mon–Sat shifts. Sundays and official holidays are excluded from working day deductions.
            </p>
          </div>
        </div>

        {/* Bottom sign out */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={logoutCurrentUser}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
