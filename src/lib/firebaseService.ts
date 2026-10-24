import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
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
  AttendanceException,
  AttendanceRecord,
  AuditLog,
  Holiday,
  NotificationSettings,
  User
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

const USERS_COL = 'users';
const ATTENDANCE_COL = 'attendance';
const EXCEPTIONS_COL = 'exceptions';
const HOLIDAYS_COL = 'holidays';
const AUDIT_LOGS_COL = 'audit_logs';
const SETTINGS_COL = 'settings';
const NOTIFICATION_DOC_ID = 'notification_settings';

// Initialize and seed collections if empty, ensuring festival holidays are synced
export async function seedInitialDataIfEmpty() {
  try {
    const holidaysSnap = await getDocs(collection(db, HOLIDAYS_COL));
    if (holidaysSnap.empty) {
      const holidayBatch = writeBatch(db);
      for (const hol of INITIAL_HOLIDAYS) {
        holidayBatch.set(doc(db, HOLIDAYS_COL, hol.id), hol);
      }
      await holidayBatch.commit();
      console.log('Successfully seeded festival holidays to Firestore.');
    } else {
      // Sync festival holidays to ensure the calendar is fully up-to-date with festivals
      const existingHolidayDates = new Set(holidaysSnap.docs.map(d => (d.data() as Holiday).date));
      const holidayBatch = writeBatch(db);
      let newHolidaysCount = 0;
      for (const hol of INITIAL_HOLIDAYS) {
        if (!existingHolidayDates.has(hol.date)) {
          holidayBatch.set(doc(db, HOLIDAYS_COL, hol.id), hol);
          newHolidaysCount++;
        }
      }
      if (newHolidaysCount > 0) {
        await holidayBatch.commit();
        console.log(`Synced ${newHolidaysCount} new festival holidays to Firestore.`);
      }
    }
  } catch (error) {
    console.warn('Initial Firestore seed check failed or already seeded:', error);
  }
}

// Subscriptions
export function subscribeToUsers(onData: (users: User[]) => void) {
  return onSnapshot(
    collection(db, USERS_COL),
    snapshot => {
      const allUsers = snapshot.docs.map(d => d.data() as User);
      // Exclude legacy mock demo accounts so only real user accounts appear
      const realUsers = allUsers.filter(
        u => !u.id.startsWith('user-emp-') && u.id !== 'user-admin-main'
      );
      onData(realUsers);
    },
    error => {
      console.warn('Users subscription notice:', error);
    }
  );
}

export function subscribeToAttendance(onData: (records: AttendanceRecord[]) => void) {
  return onSnapshot(
    collection(db, ATTENDANCE_COL),
    snapshot => {
      const allRecords = snapshot.docs.map(d => d.data() as AttendanceRecord);
      // Exclude legacy mock attendance records
      const realRecords = allRecords.filter(
        r => !r.employee_id.startsWith('user-emp-') && r.employee_id !== 'user-admin-main' && !r.id.startsWith('att-oct-') && !r.id.startsWith('att-sep-')
      );
      // Sort descending by date & created_at
      realRecords.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
      onData(realRecords);
    },
    error => {
      console.warn('Attendance subscription notice:', error);
    }
  );
}

export function subscribeToExceptions(onData: (exceptions: AttendanceException[]) => void) {
  return onSnapshot(
    collection(db, EXCEPTIONS_COL),
    snapshot => {
      const allExceptions = snapshot.docs.map(d => d.data() as AttendanceException);
      const realExceptions = allExceptions.filter(
        e => !e.employee_id.startsWith('user-emp-') && e.employee_id !== 'user-admin-main'
      );
      onData(realExceptions);
    },
    error => {
      console.warn('Exceptions subscription notice:', error);
    }
  );
}

export function subscribeToHolidays(onData: (holidays: Holiday[]) => void) {
  return onSnapshot(
    collection(db, HOLIDAYS_COL),
    snapshot => {
      const holidays = snapshot.docs.map(d => d.data() as Holiday);
      onData(holidays);
    },
    error => {
      console.warn('Holidays subscription notice:', error);
    }
  );
}

export function subscribeToAuditLogs(onData: (logs: AuditLog[]) => void) {
  return onSnapshot(
    collection(db, AUDIT_LOGS_COL),
    snapshot => {
      const logs = snapshot.docs.map(d => d.data() as AuditLog);
      logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      onData(logs);
    },
    error => {
      console.warn('Audit logs subscription notice:', error);
    }
  );
}

// Utility to sanitize payload objects and strip undefined properties for Firestore
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// User CRUD
export async function fsSaveUser(user: User): Promise<void> {
  const path = `${USERS_COL}/${user.id}`;
  try {
    await setDoc(doc(db, USERS_COL, user.id), cleanForFirestore(user));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsUpdateUser(id: string, updates: Partial<User>): Promise<void> {
  const path = `${USERS_COL}/${id}`;
  try {
    await updateDoc(doc(db, USERS_COL, id), cleanForFirestore(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsDeleteUser(id: string): Promise<void> {
  const path = `${USERS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, USERS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Attendance CRUD
export async function fsSaveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const path = `${ATTENDANCE_COL}/${record.id}`;
  try {
    await setDoc(doc(db, ATTENDANCE_COL, record.id), cleanForFirestore(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Exceptions CRUD
export async function fsSaveException(exception: AttendanceException): Promise<void> {
  const path = `${EXCEPTIONS_COL}/${exception.id}`;
  try {
    await setDoc(doc(db, EXCEPTIONS_COL, exception.id), cleanForFirestore(exception));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsDeleteException(id: string): Promise<void> {
  const path = `${EXCEPTIONS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, EXCEPTIONS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Holidays CRUD
export async function fsSaveHoliday(holiday: Holiday): Promise<void> {
  const path = `${HOLIDAYS_COL}/${holiday.id}`;
  try {
    await setDoc(doc(db, HOLIDAYS_COL, holiday.id), cleanForFirestore(holiday));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsUpdateHoliday(id: string, updates: Partial<Holiday>): Promise<void> {
  const path = `${HOLIDAYS_COL}/${id}`;
  try {
    await updateDoc(doc(db, HOLIDAYS_COL, id), cleanForFirestore(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsDeleteHoliday(id: string): Promise<void> {
  const path = `${HOLIDAYS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, HOLIDAYS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Audit Logs CRUD
export async function fsSaveAuditLog(log: AuditLog): Promise<void> {
  const path = `${AUDIT_LOGS_COL}/${log.id}`;
  try {
    await setDoc(doc(db, AUDIT_LOGS_COL, log.id), cleanForFirestore(log));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Notification Settings CRUD & Real-time Subscription
export function subscribeToNotificationSettings(onData: (settings: NotificationSettings) => void) {
  return onSnapshot(
    doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID),
    snap => {
      if (snap.exists()) {
        onData(snap.data() as NotificationSettings);
      }
    },
    error => {
      console.warn('Firestore settings listener error (falling back to cache):', error);
    }
  );
}

export async function fsSaveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const path = `${SETTINGS_COL}/${NOTIFICATION_DOC_ID}`;
  try {
    await setDoc(doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID), cleanForFirestore(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
