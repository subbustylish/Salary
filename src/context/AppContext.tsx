import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXCEPTIONS,
  INITIAL_HOLIDAYS,
  INITIAL_USERS,
  DEFAULT_ADMIN_USER,
  INITIAL_NOTIFICATION_SETTINGS
} from '../data/seedData';
import {
  fsDeleteHoliday,
  fsDeleteUser,
  fsDeleteException,
  fsSaveAttendanceRecord,
  fsSaveAuditLog,
  fsSaveException,
  fsSaveHoliday,
  fsSaveNotificationSettings,
  fsSaveUser,
  fsUpdateHoliday,
  fsUpdateUser,
  seedInitialDataIfEmpty,
  subscribeToAttendance,
  subscribeToAuditLogs,
  subscribeToExceptions,
  subscribeToHolidays,
  subscribeToNotificationSettings,
  subscribeToUsers
} from '../lib/firebaseService';
import {
  AttendanceException,
  AttendanceRecord,
  AuditLog,
  ExceptionType,
  Holiday,
  LeaveBalance,
  LeaveType,
  NotificationContact,
  NotificationSettings,
  User
} from '../types';
import { formatDateToYYYYMMDD } from '../utils/dateUtils';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  attendanceRecords: AttendanceRecord[];
  exceptions: AttendanceException[];
  holidays: Holiday[];
  auditLogs: AuditLog[];
  todayDateStr: string;
  isFirestoreConnected: boolean;
  notificationSettings: NotificationSettings;
  loginUser: (identifier: string, password?: string) => boolean;
  logoutCurrentUser: () => void;
  switchUser: (userId: string) => void;
  punchLogin: (employeeId?: string, bypassTimeCheck?: boolean) => { success: boolean; message: string };
  punchLogout: (employeeId?: string) => { success: boolean; message: string };
  updateAttendanceRecord: (recordId: string, updates: Partial<AttendanceRecord>) => { success: boolean; message: string };
  triggerAutoLogoffForTest: (employeeId?: string) => { success: boolean; message: string };
  submitAttendanceException: (data: {
    employee_id: string;
    date: string;
    type: ExceptionType;
    leave_type?: LeaveType;
    reason: string;
    permission_minutes?: number;
  }) => { success: boolean; message: string };
  deleteAttendanceException: (exceptionId: string) => { success: boolean; message: string };
  addEmployee: (employee: Omit<User, 'id' | 'created_at'>) => { success: boolean; message: string };
  updateEmployee: (id: string, updates: Partial<User>) => { success: boolean; message: string };
  toggleEmployeeStatus: (id: string) => void;
  deleteEmployee: (id: string) => { success: boolean; message: string };
  addHoliday: (holiday: Omit<Holiday, 'id' | 'created_at'>) => { success: boolean; message: string };
  updateHoliday: (id: string, updates: Partial<Holiday>) => { success: boolean; message: string };
  deleteHoliday: (id: string) => { success: boolean; message: string };
  resetToDemoData: () => void;
  // Item 1: Leave balances and quotas
  getEmployeeLeaveBalance: (employeeId: string) => LeaveBalance;
  updateEmployeeLeaveQuotas: (employeeId: string, casualQuota: number, sickQuota: number) => { success: boolean; message: string };
  // Item 4: Notification Contacts & Settings
  updateNotificationSettings: (newSettings: NotificationSettings) => { success: boolean; message: string };
  updateNotificationContact: (id: string, updates: Partial<Omit<NotificationContact, 'id' | 'created_at'>>) => { success: boolean; message: string };
  addNotificationContact: (contact: Omit<NotificationContact, 'id' | 'created_at'>) => { success: boolean; message: string };
  deleteNotificationContact: (id: string) => { success: boolean; message: string };
}

const STORAGE_KEYS = {
  USERS: 'zt_salary_users_v3',
  ATTENDANCE: 'zt_salary_attendance_v3',
  EXCEPTIONS: 'zt_salary_exceptions_v3',
  HOLIDAYS: 'zt_salary_holidays_v3',
  LOGS: 'zt_salary_audit_logs_v3',
  SETTINGS: 'zt_salary_notification_settings_v3',
  CURRENT_USER: 'zt_salary_current_user_v3'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Real-time dynamic date synced with current calendar day
  const [todayDateStr, setTodayDateStr] = useState<string>(() => formatDateToYYYYMMDD(new Date()));
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [hasLoadedInitialAttendance, setHasLoadedInitialAttendance] = useState<boolean>(false);

  useEffect(() => {
    // Keep todayDateStr synchronized with real local date
    const syncToday = () => {
      const nowStr = formatDateToYYYYMMDD(new Date());
      setTodayDateStr(prev => (prev !== nowStr ? nowStr : prev));
    };
    const timer = setInterval(syncToday, 60000);
    return () => clearInterval(timer);
  }, []);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATION_SETTINGS;
    } catch {
      return INITIAL_NOTIFICATION_SETTINGS;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed = JSON.parse(stored) as User[];
        // Filter out legacy demo accounts
        const real = parsed.filter(u => !u.id.startsWith('user-emp-') && u.id !== 'user-admin-main');
        if (real.length > 0) return real;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored && stored !== 'null' && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && !parsed.id.startsWith('user-emp-') && parsed.id !== 'user-admin-main') {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (stored) {
        const parsed = JSON.parse(stored) as AttendanceRecord[];
        return parsed.filter(r => !r.employee_id.startsWith('user-emp-') && r.employee_id !== 'user-admin-main' && !r.id.startsWith('att-oct-'));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [exceptions, setExceptions] = useState<AttendanceException[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXCEPTIONS);
      return stored ? JSON.parse(stored) : INITIAL_EXCEPTIONS;
    } catch {
      return INITIAL_EXCEPTIONS;
    }
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
      if (stored) {
        const parsed = JSON.parse(stored) as Holiday[];
        // Merge missing initial festival holidays
        const existingDates = new Set(parsed.map(h => h.date));
        const merged = [...parsed];
        for (const initHol of INITIAL_HOLIDAYS) {
          if (!existingDates.has(initHol.date)) {
            merged.push(initHol);
          }
        }
        return merged;
      }
      return INITIAL_HOLIDAYS;
    } catch {
      return INITIAL_HOLIDAYS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
      return stored ? JSON.parse(stored) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Setup Firestore Real-time Listeners and Seeding on Mount
  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeAttendance: (() => void) | null = null;
    let unsubscribeExceptions: (() => void) | null = null;
    let unsubscribeHolidays: (() => void) | null = null;
    let unsubscribeAuditLogs: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;

    const initFirebaseSync = async () => {
      try {
        await seedInitialDataIfEmpty();
        setIsFirestoreConnected(true);

        unsubscribeUsers = subscribeToUsers(remoteUsers => {
          setUsers(remoteUsers);
          setCurrentUser(prev => {
            if (!prev) return null;
            return remoteUsers.find(u => u.id === prev.id) || prev;
          });
        });

        unsubscribeAttendance = subscribeToAttendance(remoteAttendance => {
          setAttendanceRecords(remoteAttendance);
          setHasLoadedInitialAttendance(true);
        });

        unsubscribeExceptions = subscribeToExceptions(remoteExceptions => {
          setExceptions(remoteExceptions);
        });

        unsubscribeHolidays = subscribeToHolidays(remoteHolidays => {
          setHolidays(remoteHolidays);
        });

        unsubscribeAuditLogs = subscribeToAuditLogs(remoteLogs => {
          setAuditLogs(remoteLogs);
        });

        unsubscribeSettings = subscribeToNotificationSettings(remoteSettings => {
          if (remoteSettings) {
            setNotificationSettings(remoteSettings);
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remoteSettings));
          }
        });
      } catch (err) {
        console.error('Firestore real-time sync initialization warning:', err);
      }
    };

    initFirebaseSync();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeAttendance) unsubscribeAttendance();
      if (unsubscribeExceptions) unsubscribeExceptions();
      if (unsubscribeHolidays) unsubscribeHolidays();
      if (unsubscribeAuditLogs) unsubscribeAuditLogs();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  // Auto-logoff logic: Only applies to past unclosed work days if an employee forgot to logout before midnight
  // CRITICAL: Checks audit logs first to prevent overwriting genuine punch-outs if a network race occurred
  const checkAutoLogoff = (records: AttendanceRecord[], logs: AuditLog[], currentUsers: User[]): AttendanceRecord[] => {
    if (!hasLoadedInitialAttendance || records.length === 0) return records;

    let hasChanges = false;
    const updated = records.map(r => {
      // Strictly only past calendar dates that have a login punch but never recorded a logout
      if (r.login_time && !r.logout_time && r.date < todayDateStr) {
        // First check audit logs: did employee punch out, but record in DB was lost or unclosed?
        const emp = currentUsers.find(u => u.id === r.employee_id);
        const empName = emp?.name?.toLowerCase() || '';
        const matchingLogoutLog = logs.find(
          l =>
            l.action === 'EMPLOYEE_LOGOUT' &&
            l.timestamp.startsWith(r.date) &&
            (empName ? l.user_name.toLowerCase().includes(empName) || l.details.toLowerCase().includes(empName) : false)
        );

        if (matchingLogoutLog) {
          // Extract punch-out from log new_value or details
          const outMatch = matchingLogoutLog.new_value?.match(/Out:\s*([^\s]+)/) || matchingLogoutLog.details?.match(/Out:\s*([^\s]+)/);
          const recoveredLogout = outMatch ? outMatch[1] : matchingLogoutLog.timestamp;
          const loginDate = new Date(r.login_time);
          const recoveredOutDate = new Date(recoveredLogout);
          const diffMinutes = Math.max(1, Math.round((recoveredOutDate.getTime() - loginDate.getTime()) / (1000 * 60)));

          hasChanges = true;
          const restoredRec: AttendanceRecord = {
            ...r,
            logout_time: recoveredLogout,
            total_working_minutes: diffMinutes,
            missed_logout: false,
            notes: 'Restored verified punch-out from audit log',
            updated_at: new Date().toISOString()
          };
          fsSaveAttendanceRecord(restoredRec).catch(console.error);
          return restoredRec;
        }

        // No verified punch-out log found: apply 6:30 PM auto logoff (18:30 IST is 13:00 UTC)
        const [year, month, day] = r.date.split('-').map(Number);
        const autoLogoutDate = new Date(Date.UTC(year, month - 1, day, 13, 0, 0));
        const autoLogoutTimestamp = autoLogoutDate.toISOString();
        const loginDate = new Date(r.login_time);
        let diffMinutes = Math.round((autoLogoutDate.getTime() - loginDate.getTime()) / (1000 * 60));
        if (diffMinutes <= 0 || isNaN(diffMinutes)) {
          diffMinutes = 540; // 9 hours standard working shift
        }

        hasChanges = true;
        const updatedRec: AttendanceRecord = {
          ...r,
          logout_time: autoLogoutTimestamp,
          total_working_minutes: diffMinutes,
          missed_logout: true,
          notes: 'Auto logoff @ 6:30 PM applied for unclosed past session.',
          updated_at: new Date().toISOString()
        };
        fsSaveAttendanceRecord(updatedRec).catch(console.error);
        return updatedRec;
      }
      return r;
    });

    return hasChanges ? updated : records;
  };

  // Run auto logoff check ONLY after initial Firestore attendance has loaded and periodically
  useEffect(() => {
    if (!hasLoadedInitialAttendance) return;
    setAttendanceRecords(prev => checkAutoLogoff(prev, auditLogs, users));
    const interval = setInterval(() => {
      setAttendanceRecords(prev => checkAutoLogoff(prev, auditLogs, users));
    }, 60000);
    return () => clearInterval(interval);
  }, [hasLoadedInitialAttendance, auditLogs, users]);

  // Sync to localStorage as offline cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXCEPTIONS, JSON.stringify(exceptions));
  }, [exceptions]);

  // Auto-reconcile orphan exceptions: If an attendance record is 'present' with full working shift (>= 420 mins),
  // automatically purge conflicting half_day or absent exceptions for that date so calendar immediately reflects 'Present'
  useEffect(() => {
    const conflictingIds: string[] = [];
    exceptions.forEach(e => {
      const rec = attendanceRecords.find(r => r.employee_id === e.employee_id && r.date === e.date);
      if (rec && rec.status === 'present' && rec.total_working_minutes >= 420 && e.type !== 'wfh') {
        conflictingIds.push(e.id);
      }
    });

    if (conflictingIds.length > 0) {
      setExceptions(prev => prev.filter(e => !conflictingIds.includes(e.id)));
      conflictingIds.forEach(id => {
        fsDeleteException(id).catch(console.error);
      });
    }
  }, [attendanceRecords, exceptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (
    action: string,
    entity: AuditLog['entity'],
    details: string,
    previous_value?: string,
    new_value?: string
  ) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_name: currentUser ? currentUser.name : 'System',
      user_role: currentUser ? currentUser.role : 'system',
      action,
      entity,
      details,
      previous_value,
      new_value,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
    fsSaveAuditLog(newLog).catch(console.error);
  };

  const loginUser = (identifier: string, password?: string): boolean => {
    const trimmed = identifier.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    const found = users.find(
      u =>
        u.username.toLowerCase() === trimmed ||
        u.email.toLowerCase() === trimmed ||
        u.employee_id.toLowerCase() === trimmed
    );

    if (found) {
      if (found.status === 'inactive') {
        return false;
      }

      // Check strictly against user's stored password configured in the dashboard
      const storedPassword = (found.password || '').trim();
      if (!cleanPassword || cleanPassword !== storedPassword) {
        return false;
      }

      setCurrentUser(found);
      addAuditLog('USER_LOGIN', 'auth', `${found.role === 'admin' ? 'Admin' : 'User'} ${found.name} logged in successfully.`);
      return true;
    }

    return false;
  };

  const logoutCurrentUser = () => {
    if (currentUser) {
      addAuditLog('USER_LOGOUT', 'auth', `User ${currentUser.name} signed out.`);
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const switchUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      addAuditLog('ROLE_SWITCH', 'auth', `Switched active session to ${found.name} (${found.role}).`);
    }
  };

  // Biometric / Automated system punch login (Activates at 9:30 AM every working day, except Sundays & Holidays)
  const punchLogin = (employeeId?: string, bypassTimeCheck: boolean = false): { success: boolean; message: string } => {
    const empId = employeeId || (currentUser ? currentUser.id : null);
    if (!empId) {
      return { success: false, message: 'No employee identified for punch-in.' };
    }

    const employee = users.find(u => u.id === empId);
    if (!employee) {
      return { success: false, message: 'Employee not found.' };
    }

    // Check if employee is inactive
    if (employee.status === 'inactive') {
      return { success: false, message: 'Cannot record attendance for inactive employee.' };
    }

    // Check if today is a Sunday
    const [y, m, d] = todayDateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (dayOfWeek === 0) {
      return { success: false, message: 'Today is Sunday (non-working day). Office is closed.' };
    }

    // Check if today is a holiday
    const holidayToday = holidays.find(h => h.date === todayDateStr);
    if (holidayToday) {
      return {
        success: false,
        message: `Today is an official holiday: ${holidayToday.name}. Attendance not required.`
      };
    }

    // Check 9:30 AM login activation rule
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const isBefore930 = currentHours < 9 || (currentHours === 9 && currentMinutes < 30);

    if (!bypassTimeCheck && isBefore930) {
      return {
        success: false,
        message: 'Office login activates at 9:30 AM every working day. Punch-in is not permitted before 9:30 AM.'
      };
    }

    // Check existing record for today
    const existing = attendanceRecords.find(
      r => r.employee_id === empId && r.date === todayDateStr
    );

    if (existing) {
      if (existing.login_time && !existing.logout_time) {
        return {
          success: false,
          message: 'Duplicate Login Denied: You are already logged in for this active session!'
        };
      }
      if (existing.login_time && existing.logout_time) {
        return {
          success: false,
          message: 'Session already completed for today. Cannot log in again for the same date.'
        };
      }
    }

    // Capture system timestamp automatically
    const loginTimestamp = now.toISOString();

    if (existing) {
      const updatedRec: AttendanceRecord = {
        ...existing,
        login_time: loginTimestamp,
        status: 'present',
        updated_at: loginTimestamp
      };
      setAttendanceRecords(prev =>
        prev.map(r => (r.id === existing.id ? updatedRec : r))
      );
      fsSaveAttendanceRecord(updatedRec).catch(console.error);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employee_id: empId,
        date: todayDateStr,
        login_time: loginTimestamp,
        logout_time: null,
        total_working_minutes: 0,
        status: 'present',
        created_at: loginTimestamp,
        updated_at: loginTimestamp
      };
      setAttendanceRecords(prev => [newRecord, ...prev]);
      fsSaveAttendanceRecord(newRecord).catch(console.error);
    }

    addAuditLog(
      'EMPLOYEE_LOGIN',
      'attendance',
      `System captured automated punch-in for ${employee.name}.`,
      undefined,
      loginTimestamp
    );

    return {
      success: true,
      message: `Login timestamp recorded successfully at ${now.toLocaleTimeString()}`
    };
  };

  // Biometric / Automated system punch logout
  const punchLogout = (employeeId?: string): { success: boolean; message: string } => {
    const empId = employeeId || (currentUser ? currentUser.id : null);
    if (!empId) {
      return { success: false, message: 'No employee identified for punch-out.' };
    }

    const employee = users.find(u => u.id === empId);
    if (!employee) {
      return { success: false, message: 'Employee not found.' };
    }

    const existing = attendanceRecords.find(
      r => r.employee_id === empId && r.date === todayDateStr
    );

    if (!existing || !existing.login_time) {
      return {
        success: false,
        message: 'Cannot log out without an active login punch.'
      };
    }

    if (existing.logout_time && !existing.missed_logout) {
      return {
        success: false,
        message: 'Already logged out for this session.'
      };
    }

    const now = new Date();
    const logoutTimestamp = now.toISOString();

    // Calculate exact duration worked
    const loginDate = new Date(existing.login_time);
    const diffMinutes = Math.max(1, Math.round((now.getTime() - loginDate.getTime()) / (1000 * 60)));

    const updatedRec: AttendanceRecord = {
      ...existing,
      logout_time: logoutTimestamp,
      total_working_minutes: diffMinutes,
      missed_logout: false,
      notes: 'Recorded office punch-out',
      updated_at: logoutTimestamp
    };

    setAttendanceRecords(prev =>
      prev.map(r => (r.id === existing.id ? updatedRec : r))
    );
    fsSaveAttendanceRecord(updatedRec).catch(console.error);

    addAuditLog(
      'EMPLOYEE_LOGOUT',
      'attendance',
      `Punch-out recorded for ${employee.name}. Total working hours: ${(diffMinutes / 60).toFixed(1)} hrs.`,
      `In: ${existing.login_time}`,
      `Out: ${logoutTimestamp}`
    );

    return {
      success: true,
      message: `Logout recorded at ${now.toLocaleTimeString()}. Total working duration: ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`
    };
  };

  // Admin correction: Adjust exact login/logout timestamps or status for an attendance record
  const updateAttendanceRecord = (
    recordId: string,
    updates: Partial<AttendanceRecord>
  ): { success: boolean; message: string } => {
    const existing = attendanceRecords.find(r => r.id === recordId);
    if (!existing) {
      return { success: false, message: 'Attendance record not found.' };
    }

    // Recalculate working duration if in/out times are updated
    let calculatedMinutes = updates.total_working_minutes ?? existing.total_working_minutes;
    const effectiveIn = updates.login_time !== undefined ? updates.login_time : existing.login_time;
    const effectiveOut = updates.logout_time !== undefined ? updates.logout_time : existing.logout_time;

    if (updates.status === 'absent') {
      updates.login_time = null;
      updates.logout_time = null;
      updates.missed_logout = false;
      calculatedMinutes = 0;
    } else if (effectiveIn && effectiveOut && updates.total_working_minutes === undefined) {
      try {
        const inDate = new Date(effectiveIn);
        const outDate = new Date(effectiveOut);
        if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
          calculatedMinutes = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60)));
        }
      } catch {
        // Fall back to existing
      }
    }

    const updatedRec: AttendanceRecord = {
      ...existing,
      ...updates,
      total_working_minutes: calculatedMinutes,
      updated_at: new Date().toISOString()
    };

    setAttendanceRecords(prev => prev.map(r => (r.id === recordId ? updatedRec : r)));
    fsSaveAttendanceRecord(updatedRec).catch(console.error);

    // CRITICAL: Synchronize exceptions collection when admin explicitly adjusts an attendance record
    if (updates.status === 'present') {
      // If admin marked as present (full day), automatically remove any conflicting exception for this employee on this date
      const conflicting = exceptions.filter(
        e => e.employee_id === existing.employee_id && e.date === existing.date
      );
      if (conflicting.length > 0) {
        setExceptions(prev =>
          prev.filter(e => !(e.employee_id === existing.employee_id && e.date === existing.date))
        );
        conflicting.forEach(ce => {
          fsDeleteException(ce.id).catch(console.error);
        });
      }
    } else if (updates.status) {
      // If admin marked as half_day, permission, wfh, or absent, sync with exceptions table
      const matchingExc = exceptions.find(
        e => e.employee_id === existing.employee_id && e.date === existing.date
      );
      if (matchingExc) {
        const updatedExc: AttendanceException = {
          ...matchingExc,
          type: updates.status,
          reason: updates.notes || matchingExc.reason
        };
        setExceptions(prev =>
          prev.map(e => (e.id === matchingExc.id ? updatedExc : e))
        );
        fsSaveException(updatedExc).catch(console.error);
      }
    }

    const emp = users.find(u => u.id === existing.employee_id);
    addAuditLog(
      'ATTENDANCE_CORRECTED',
      'attendance',
      `Admin adjusted attendance record for ${emp?.name || existing.employee_id} on ${existing.date}.`,
      `In: ${existing.login_time} | Out: ${existing.logout_time} | Mins: ${existing.total_working_minutes}`,
      `In: ${updatedRec.login_time} | Out: ${updatedRec.logout_time} | Mins: ${updatedRec.total_working_minutes}`
    );

    return { success: true, message: 'Attendance record and exception status updated successfully.' };
  };

  const triggerAutoLogoffForTest = (employeeId?: string): { success: boolean; message: string } => {
    const empId = employeeId || (currentUser ? currentUser.id : null);
    if (!empId) return { success: false, message: 'No employee identified for auto-logoff.' };

    const employee = users.find(u => u.id === empId);
    const existing = attendanceRecords.find(r => r.employee_id === empId && r.date === todayDateStr);

    if (!existing || !existing.login_time) {
      return { success: false, message: 'Cannot auto-logoff without an active login punch.' };
    }
    if (existing.logout_time) {
      return { success: false, message: 'Employee has already logged out for today.' };
    }

    const autoLogoutTimestamp = `${todayDateStr}T18:30:00Z`;
    const loginDate = new Date(existing.login_time);
    const autoLogoutDate = new Date(autoLogoutTimestamp);
    let diffMinutes = Math.round((autoLogoutDate.getTime() - loginDate.getTime()) / (1000 * 60));
    if (diffMinutes <= 0 || isNaN(diffMinutes)) {
      diffMinutes = 585; // ~9h 45m from 08:45 AM to 06:30 PM
    }

    const updatedRec: AttendanceRecord = {
      ...existing,
      logout_time: autoLogoutTimestamp,
      total_working_minutes: diffMinutes,
      missed_logout: true,
      notes: 'Missed logout time. Auto logoff @ 6:30 PM applied.',
      updated_at: new Date().toISOString()
    };

    setAttendanceRecords(prev =>
      prev.map(r => (r.id === existing.id ? updatedRec : r))
    );
    fsSaveAttendanceRecord(updatedRec).catch(console.error);

    addAuditLog(
      'AUTO_LOGOFF_TRIGGERED',
      'attendance',
      `Auto logoff applied @ 6:30 PM for ${employee?.name || empId} due to missed manual punch-out. Duration: ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m.`,
      `In: ${existing.login_time}`,
      `Auto Out: ${autoLogoutTimestamp}`
    );

    return {
      success: true,
      message: 'Missed logout detected: Auto logoff triggered at 6:30 PM with status "Missed Logout Time".'
    };
  };

  // Calculate dynamic leave balances for employee
  const getEmployeeLeaveBalance = (employeeId: string): LeaveBalance => {
    const employee = users.find(u => u.id === employeeId);
    const casualTotal = employee?.casual_leave_quota !== undefined ? employee.casual_leave_quota : 10;
    const sickTotal = employee?.sick_leave_quota !== undefined ? employee.sick_leave_quota : 10;

    // Count all approved leave exceptions for this employee
    const empExceptions = exceptions.filter(
      e => e.employee_id === employeeId && e.type === 'absent' && e.approval_status !== 'rejected'
    );

    let casualUsed = 0;
    let sickUsed = 0;

    for (const exc of empExceptions) {
      if (exc.leave_type === 'sick') {
        sickUsed += 1;
      } else if (exc.leave_type === 'casual') {
        casualUsed += 1;
      } else {
        // Default unassigned absent leaves count as casual
        casualUsed += 1;
      }
    }

    return {
      casual_leave_total: casualTotal,
      casual_leave_used: casualUsed,
      sick_leave_total: sickTotal,
      sick_leave_used: sickUsed
    };
  };

  const updateEmployeeLeaveQuotas = (
    employeeId: string,
    casualQuota: number,
    sickQuota: number
  ): { success: boolean; message: string } => {
    const employee = users.find(u => u.id === employeeId);
    if (!employee) return { success: false, message: 'Employee not found.' };

    const updates = {
      casual_leave_quota: Math.max(0, Math.round(casualQuota)),
      sick_leave_quota: Math.max(0, Math.round(sickQuota))
    };

    setUsers(prev => prev.map(u => (u.id === employeeId ? { ...u, ...updates } : u)));
    if (currentUser?.id === employeeId) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }
    fsUpdateUser(employeeId, updates).catch(console.error);

    addAuditLog(
      'LEAVE_QUOTA_UPDATED',
      'employee',
      `Admin updated leave quotas for ${employee.name}: Casual=${updates.casual_leave_quota}, Sick=${updates.sick_leave_quota}.`,
      `CL:${employee.casual_leave_quota ?? 10}, SL:${employee.sick_leave_quota ?? 10}`,
      `CL:${updates.casual_leave_quota}, SL:${updates.sick_leave_quota}`
    );

    return {
      success: true,
      message: `Leave quotas updated for ${employee.name}: ${updates.casual_leave_quota} Casual & ${updates.sick_leave_quota} Sick leaves.`
    };
  };

  const submitAttendanceException = (data: {
    employee_id: string;
    date: string;
    type: ExceptionType;
    leave_type?: LeaveType;
    reason: string;
    permission_minutes?: number;
  }): { success: boolean; message: string } => {
    const { employee_id, date, type, leave_type, reason, permission_minutes } = data;

    if (!reason.trim()) {
      return { success: false, message: 'Please provide a valid reason for this exception.' };
    }

    // Check Sunday
    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (dayOfWeek === 0) {
      return { success: false, message: 'Selected date is Sunday. Attendance exceptions are not applicable on non-working days.' };
    }

    // Check holiday
    const isHoliday = holidays.find(h => h.date === date);
    if (isHoliday) {
      return {
        success: false,
        message: `Selected date is an official organization holiday (${isHoliday.name}). Exceptions are not applicable.`
      };
    }

    if (type === 'permission' && (!permission_minutes || permission_minutes <= 0)) {
      return { success: false, message: 'Please specify a valid duration in minutes for permission.' };
    }

    // If type is absent, check leave type quotas strictly
    const resolvedLeaveType: LeaveType | undefined = type === 'absent' ? (leave_type || 'casual') : undefined;

    // Check remaining balance strictly
    const balance = getEmployeeLeaveBalance(employee_id);
    let balanceNote = '';
    if (type === 'absent') {
      const casualLeft = balance.casual_leave_total - balance.casual_leave_used;
      const sickLeft = balance.sick_leave_total - balance.sick_leave_used;

      if (resolvedLeaveType === 'casual' && casualLeft <= 0) {
        return {
          success: false,
          message: 'Casual Leave limit exceeded (0 days remaining). Cannot apply for Casual Leave.'
        };
      }

      if (resolvedLeaveType === 'sick' && sickLeft <= 0) {
        return {
          success: false,
          message: 'Sick Leave limit exceeded (0 days remaining). Cannot apply for Sick Leave.'
        };
      }

      if (resolvedLeaveType === 'casual') {
        const remaining = casualLeft - 1;
        balanceNote = ` (Remaining Casual Leave: ${remaining}/${balance.casual_leave_total})`;
      } else if (resolvedLeaveType === 'sick') {
        const remaining = sickLeft - 1;
        balanceNote = ` (Remaining Sick Leave: ${remaining}/${balance.sick_leave_total})`;
      }
    }

    // Create or update exception
    const newException: AttendanceException = {
      id: `exc-${Date.now()}`,
      employee_id,
      date,
      type,
      leave_type: resolvedLeaveType,
      reason: reason.trim(),
      permission_minutes: type === 'permission' ? permission_minutes : undefined,
      approval_status: 'approved',
      created_at: new Date().toISOString()
    };

    setExceptions(prev => [newException, ...prev.filter(e => !(e.employee_id === employee_id && e.date === date))]);
    fsSaveException(newException).catch(console.error);

    // Also sync to attendance records
    const minutes = type === 'half_day' ? 240 : type === 'permission' ? 300 : type === 'wfh' ? 480 : 0;
    const existing = attendanceRecords.find(r => r.employee_id === employee_id && r.date === date);

    if (existing) {
      const updatedRec: AttendanceRecord = {
        ...existing,
        status: type,
        missed_logout: type === 'wfh' ? false : existing.missed_logout,
        notes: reason.trim() || `Approved ${type.toUpperCase()}`,
        total_working_minutes: existing.total_working_minutes > 0 ? existing.total_working_minutes : minutes,
        updated_at: new Date().toISOString()
      };
      setAttendanceRecords(prev => prev.map(r => (r.id === existing.id ? updatedRec : r)));
      fsSaveAttendanceRecord(updatedRec).catch(console.error);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employee_id,
        date,
        login_time: null,
        logout_time: null,
        total_working_minutes: minutes,
        status: type,
        missed_logout: false,
        notes: reason.trim() || `Approved ${type.toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setAttendanceRecords(prev => [newRecord, ...prev]);
      fsSaveAttendanceRecord(newRecord).catch(console.error);
    }

    const emp = users.find(u => u.id === employee_id);
    const leaveLabel = type === 'absent' ? `${resolvedLeaveType?.toUpperCase()} LEAVE` : type.toUpperCase();

    addAuditLog(
      'EXCEPTION_SUBMITTED',
      'attendance',
      `Submitted ${leaveLabel} exception for ${emp?.name || employee_id} on ${date}: "${reason}".`,
      undefined,
      leaveLabel
    );

    return {
      success: true,
      message: `${leaveLabel} request recorded and attendance updated.${balanceNote}`
    };
  };

  // Delete attendance exception (e.g. if employee submitted wrongly, admin deletes during salary calculation)
  const deleteAttendanceException = (exceptionId: string): { success: boolean; message: string } => {
    const targetExc = exceptions.find(e => e.id === exceptionId);
    if (!targetExc) {
      return { success: false, message: 'Exception record not found.' };
    }

    const { employee_id, date, type, leave_type } = targetExc;
    const emp = users.find(u => u.id === employee_id);

    // 1. Remove exception from local state and delete from Firestore
    setExceptions(prev => prev.filter(e => e.id !== exceptionId));
    fsDeleteException(exceptionId).catch(console.error);

    // 2. Restore attendance record to 'present' so salary calculation treats it as a working day with ₹0 deduction
    const existingRec = attendanceRecords.find(r => r.employee_id === employee_id && r.date === date);
    if (existingRec) {
      const restoredRec: AttendanceRecord = {
        ...existingRec,
        status: 'present',
        total_working_minutes: existingRec.total_working_minutes > 0 ? existingRec.total_working_minutes : 480,
        login_time: existingRec.login_time || '09:30:00',
        logout_time: existingRec.logout_time || '18:30:00',
        updated_at: new Date().toISOString()
      };
      setAttendanceRecords(prev => prev.map(r => (r.id === existingRec.id ? restoredRec : r)));
      fsSaveAttendanceRecord(restoredRec).catch(console.error);
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employee_id,
        date,
        login_time: '09:30:00',
        logout_time: '18:30:00',
        total_working_minutes: 480,
        status: 'present',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setAttendanceRecords(prev => [newRec, ...prev]);
      fsSaveAttendanceRecord(newRec).catch(console.error);
    }

    const typeLabel = type === 'absent' ? `${leave_type ? leave_type.toUpperCase() + ' ' : ''}LEAVE` : type.toUpperCase();

    addAuditLog(
      'EXCEPTION_DELETED',
      'salary',
      `Admin deleted wrong ${typeLabel} request for ${emp?.name || employee_id} on ${date}. Restored as a regular working day with ₹0 deduction.`,
      `Exception ID: ${exceptionId}`,
      'Restored as Working Day'
    );

    return {
      success: true,
      message: `Deleted ${typeLabel} request for ${date}. Day has been restored as a working day with ₹0 deduction.`
    };
  };

  // Notification contacts and settings management
  const updateNotificationSettings = (
    newSettings: NotificationSettings
  ): { success: boolean; message: string } => {
    setNotificationSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    fsSaveNotificationSettings(newSettings).catch(console.error);

    addAuditLog(
      'NOTIFICATION_SETTINGS_UPDATED',
      'auth',
      `Admin updated notification and alert settings (${newSettings.emails.length} emails, ${newSettings.mobiles.length} mobile numbers).`,
      undefined,
      `Emails: ${newSettings.emails.length}, Mobiles: ${newSettings.mobiles.length}`
    );

    return { success: true, message: 'Notification settings updated successfully.' };
  };

  const addNotificationContact = (
    contactData: Omit<NotificationContact, 'id' | 'created_at'>
  ): { success: boolean; message: string } => {
    const newContact: NotificationContact = {
      ...contactData,
      id: `contact-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const updatedSettings: NotificationSettings = {
      ...notificationSettings,
      emails:
        contactData.type === 'email'
          ? [...notificationSettings.emails, newContact]
          : notificationSettings.emails,
      mobiles:
        contactData.type === 'mobile'
          ? [...notificationSettings.mobiles, newContact]
          : notificationSettings.mobiles
    };

    setNotificationSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    fsSaveNotificationSettings(updatedSettings).catch(console.error);

    addAuditLog(
      'NOTIFICATION_CONTACT_ADDED',
      'auth',
      `Added ${contactData.type === 'email' ? 'email' : 'mobile'} recipient: ${contactData.name} (${contactData.value}).`,
      undefined,
      contactData.value
    );

    return {
      success: true,
      message: `${contactData.type === 'email' ? 'Email recipient' : 'Mobile number'} added successfully.`
    };
  };

  const updateNotificationContact = (
    id: string,
    updates: Partial<Omit<NotificationContact, 'id' | 'created_at'>>
  ): { success: boolean; message: string } => {
    const existing =
      notificationSettings.emails.find(c => c.id === id) ||
      notificationSettings.mobiles.find(c => c.id === id);

    if (!existing) {
      return { success: false, message: 'Recipient contact not found.' };
    }

    const updatedSettings: NotificationSettings = {
      ...notificationSettings,
      emails: notificationSettings.emails.map(c => (c.id === id ? { ...c, ...updates } : c)),
      mobiles: notificationSettings.mobiles.map(c => (c.id === id ? { ...c, ...updates } : c))
    };

    setNotificationSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    fsSaveNotificationSettings(updatedSettings).catch(console.error);

    addAuditLog(
      'NOTIFICATION_CONTACT_UPDATED',
      'auth',
      `Admin updated notification recipient: ${existing.name} -> ${updates.name || existing.name} (${updates.value || existing.value}).`,
      existing.value,
      updates.value || existing.value
    );

    return { success: true, message: 'Notification recipient details updated and saved to database!' };
  };

  const deleteNotificationContact = (id: string): { success: boolean; message: string } => {
    const contactToDelete =
      notificationSettings.emails.find(c => c.id === id) ||
      notificationSettings.mobiles.find(c => c.id === id);

    const updatedSettings: NotificationSettings = {
      ...notificationSettings,
      emails: notificationSettings.emails.filter(c => c.id !== id),
      mobiles: notificationSettings.mobiles.filter(c => c.id !== id)
    };

    setNotificationSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    fsSaveNotificationSettings(updatedSettings).catch(console.error);

    if (contactToDelete) {
      addAuditLog(
        'NOTIFICATION_CONTACT_DELETED',
        'auth',
        `Removed notification contact: ${contactToDelete.name} (${contactToDelete.value}).`,
        contactToDelete.value,
        undefined
      );
    }

    return { success: true, message: 'Recipient contact removed successfully.' };
  };

  const addEmployee = (employeeData: Omit<User, 'id' | 'created_at'>): { success: boolean; message: string } => {
    // Check duplicate username or ID
    const exists = users.find(
      u => u.username.toLowerCase() === employeeData.username.toLowerCase() ||
           u.employee_id.toLowerCase() === employeeData.employee_id.toLowerCase()
    );
    if (exists) {
      return { success: false, message: 'Employee ID or Username already exists. Please choose a unique one.' };
    }

    if (employeeData.monthly_salary < 0) {
      return { success: false, message: 'Monthly salary must be a positive amount.' };
    }

    const newEmp: User = {
      ...employeeData,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    setUsers(prev => [...prev, newEmp]);
    fsSaveUser(newEmp).catch(console.error);

    addAuditLog(
      'EMPLOYEE_CREATED',
      'employee',
      `Admin added new employee: ${newEmp.name} (${newEmp.employee_id}) in ${newEmp.department}. Base Salary: ₹${newEmp.monthly_salary.toLocaleString('en-IN')}`,
      undefined,
      newEmp.employee_id
    );

    return { success: true, message: `Employee ${newEmp.name} created successfully.` };
  };

  const updateEmployee = (id: string, updates: Partial<User>): { success: boolean; message: string } => {
    const existing = users.find(u => u.id === id);
    if (!existing) {
      return { success: false, message: 'Employee not found.' };
    }

    if (updates.employee_id) {
      const cleanEmpId = updates.employee_id.trim();
      const duplicateEmpId = users.find(
        u => u.id !== id && u.employee_id.toLowerCase() === cleanEmpId.toLowerCase()
      );
      if (duplicateEmpId) {
        return {
          success: false,
          message: `Employee ID "${cleanEmpId}" is already assigned to ${duplicateEmpId.name}.`
        };
      }
      updates.employee_id = cleanEmpId;
    }

    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const duplicateUser = users.find(
        u => u.id !== id && u.username.toLowerCase() === cleanUsername
      );
      if (duplicateUser) {
        return {
          success: false,
          message: `Username "@${cleanUsername}" is already taken by ${duplicateUser.name}.`
        };
      }
      updates.username = cleanUsername;
    }

    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const duplicateEmail = users.find(
        u => u.id !== id && u.email.toLowerCase() === cleanEmail
      );
      if (duplicateEmail) {
        return {
          success: false,
          message: `Email address "${cleanEmail}" is already used by ${duplicateEmail.name}.`
        };
      }
      updates.email = cleanEmail;
    }

    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    if (currentUser?.id === id) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }
    fsUpdateUser(id, updates).catch(console.error);

    addAuditLog(
      'EMPLOYEE_UPDATED',
      'employee',
      `Updated details for ${existing.name} (${updates.employee_id || existing.employee_id}).`,
      JSON.stringify({ empId: existing.employee_id, username: existing.username, salary: existing.monthly_salary }),
      JSON.stringify({
        empId: updates.employee_id ?? existing.employee_id,
        username: updates.username ?? existing.username,
        salary: updates.monthly_salary ?? existing.monthly_salary
      })
    );

    return { success: true, message: 'Employee details updated successfully.' };
  };

  const toggleEmployeeStatus = (id: string) => {
    const existing = users.find(u => u.id === id);
    if (!existing) return;
    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: newStatus } : u)));
    fsUpdateUser(id, { status: newStatus }).catch(console.error);

    addAuditLog(
      'EMPLOYEE_STATUS_CHANGED',
      'employee',
      `Employee ${existing.name} status switched to ${newStatus}.`,
      existing.status,
      newStatus
    );
  };

  const deleteEmployee = (id: string): { success: boolean; message: string } => {
    const existing = users.find(u => u.id === id);
    if (!existing) {
      return { success: false, message: 'Employee not found.' };
    }

    if (currentUser?.id === id) {
      return {
        success: false,
        message: 'Security restriction: You cannot delete your own currently logged-in account.'
      };
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    fsDeleteUser(id).catch(console.error);

    addAuditLog(
      'EMPLOYEE_DELETED',
      'employee',
      `Deleted employee ${existing.name} (${existing.employee_id}) from ${existing.department}.`,
      existing.name,
      'DELETED'
    );

    return {
      success: true,
      message: `Employee ${existing.name} (${existing.employee_id}) was successfully deleted.`
    };
  };

  const addHoliday = (holidayData: Omit<Holiday, 'id' | 'created_at'>): { success: boolean; message: string } => {
    const exists = holidays.find(h => h.date === holidayData.date);
    if (exists) {
      return { success: false, message: `A holiday is already configured for ${holidayData.date}: ${exists.name}` };
    }

    const newH: Holiday = {
      ...holidayData,
      id: `hol-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    setHolidays(prev => [...prev, newH]);
    fsSaveHoliday(newH).catch(console.error);

    addAuditLog(
      'HOLIDAY_CREATED',
      'holiday',
      `New holiday added: ${newH.name} on ${newH.date}. Working day calculation automatically updated.`,
      undefined,
      newH.date
    );

    return { success: true, message: `Holiday ${newH.name} added.` };
  };

  const updateHoliday = (id: string, updates: Partial<Holiday>): { success: boolean; message: string } => {
    const existing = holidays.find(h => h.id === id);
    if (!existing) return { success: false, message: 'Holiday not found.' };

    setHolidays(prev => prev.map(h => (h.id === id ? { ...h, ...updates } : h)));
    fsUpdateHoliday(id, updates).catch(console.error);

    addAuditLog(
      'HOLIDAY_UPDATED',
      'holiday',
      `Updated holiday ${existing.name} (${existing.date}).`,
      existing.name,
      updates.name || existing.name
    );

    return { success: true, message: 'Holiday updated.' };
  };

  const deleteHoliday = (id: string): { success: boolean; message: string } => {
    const existing = holidays.find(h => h.id === id);
    if (!existing) return { success: false, message: 'Holiday not found.' };

    setHolidays(prev => prev.filter(h => h.id !== id));
    fsDeleteHoliday(id).catch(console.error);

    addAuditLog(
      'HOLIDAY_DELETED',
      'holiday',
      `Deleted holiday ${existing.name} scheduled for ${existing.date}.`,
      existing.name,
      undefined
    );

    return { success: true, message: `Holiday ${existing.name} removed.` };
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.EXCEPTIONS);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

    setUsers(INITIAL_USERS);
    setAttendanceRecords(INITIAL_ATTENDANCE_RECORDS);
    setExceptions(INITIAL_EXCEPTIONS);
    setHolidays(INITIAL_HOLIDAYS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(INITIAL_USERS[0]);

    // Reseed Firestore
    seedInitialDataIfEmpty().catch(console.error);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        attendanceRecords,
        exceptions,
        holidays,
        auditLogs,
        todayDateStr,
        isFirestoreConnected,
        loginUser,
        logoutCurrentUser,
        switchUser,
        punchLogin,
        punchLogout,
        updateAttendanceRecord,
        triggerAutoLogoffForTest,
        submitAttendanceException,
        deleteAttendanceException,
        addEmployee,
        updateEmployee,
        toggleEmployeeStatus,
        deleteEmployee,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        resetToDemoData,
        // Item 1: Leave balances and quotas
        getEmployeeLeaveBalance,
        updateEmployeeLeaveQuotas,
        // Item 4: Notification Contacts & Settings
        notificationSettings,
        updateNotificationSettings,
        updateNotificationContact,
        addNotificationContact,
        deleteNotificationContact
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
