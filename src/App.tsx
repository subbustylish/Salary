import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/auth/LoginView';

// Employee components
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { EmployeeAttendanceView } from './components/employee/EmployeeAttendanceView';
import { EmployeeCalendarView } from './components/employee/EmployeeCalendarView';
import { EmployeeRequestsView } from './components/employee/EmployeeRequestsView';
import { EmployeeHolidaysView } from './components/employee/EmployeeHolidaysView';

// Admin components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { AttendanceExplorer } from './components/admin/AttendanceExplorer';
import { GraphicalReports } from './components/admin/GraphicalReports';
import { HolidayManagement } from './components/admin/HolidayManagement';
import { SalaryManagement } from './components/admin/SalaryManagement';
import { AuditLogView } from './components/admin/AuditLogView';
import { NotificationSettingsView } from './components/admin/NotificationSettingsView';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  // Default tabs
  const [activeTab, setActiveTab] = useState<string>(isAdmin ? 'admin-dashboard' : 'dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | undefined>(undefined);

  // Sync default tab when user/role changes
  useEffect(() => {
    if (isAdmin) {
      if (!activeTab.startsWith('admin') && !['employees', 'notifications', 'analytics', 'holidays', 'salary', 'audit'].includes(activeTab)) {
        setActiveTab('admin-dashboard');
      }
    } else {
      if (!['dashboard', 'my-attendance', 'calendar', 'requests', 'holidays'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser?.role, isAdmin]);

  if (!currentUser) {
    return <LoginView />;
  }

  const handleNavigate = (tab: string, employeeId?: string) => {
    if (employeeId) {
      setTargetEmployeeId(employeeId);
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
            setMobileNavOpen(false);
          }}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Employee Tab Routing */}
            {!isAdmin && (
              <>
                {activeTab === 'dashboard' && (
                  <EmployeeDashboard onNavigateTab={handleNavigate} />
                )}
                {activeTab === 'my-attendance' && (
                  <EmployeeAttendanceView />
                )}
                {activeTab === 'calendar' && (
                  <EmployeeCalendarView />
                )}
                {activeTab === 'requests' && (
                  <EmployeeRequestsView />
                )}
                {activeTab === 'holidays' && (
                  <EmployeeHolidaysView />
                )}
              </>
            )}

            {/* Admin Tab Routing */}
            {isAdmin && (
              <>
                {activeTab === 'admin-dashboard' && (
                  <AdminDashboard onNavigateTab={handleNavigate} />
                )}
                {activeTab === 'employees' && (
                  <EmployeeManagement />
                )}
                {activeTab === 'admin-attendance' && (
                  <AttendanceExplorer initialEmployeeId={targetEmployeeId} />
                )}
                {activeTab === 'notifications' && (
                  <NotificationSettingsView />
                )}
                {activeTab === 'analytics' && (
                  <GraphicalReports />
                )}
                {activeTab === 'holidays' && (
                  <HolidayManagement />
                )}
                {activeTab === 'salary' && (
                  <SalaryManagement />
                )}
                {activeTab === 'audit' && (
                  <AuditLogView />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
