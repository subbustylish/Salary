import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import {
  INITIAL_HOLIDAYS
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

// Lightweight in-memory session counter for DB hits (transparency for Spark Free Tier)
export const sessionDbMetrics = {
  reads: 0,
  writes: 0,
  deletes: 0
};

// Seed festival holidays only if never seeded before (preserves free tier reads)
export async function seedInitialDataIfEmpty() {
  try {
    const hasSeededLocally = localStorage.getItem('zt_holidays_seeded_v3');
    if (hasSeededLocally === 'true') {
      return;
    }

    const holidaysSnap = await getDocs(collection(db, HOLIDAYS_COL));
    sessionDbMetrics.reads += holidaysSnap.size;

    if (holidaysSnap.empty) {
      const holidayBatch = writeBatch(db);
      for (const hol of INITIAL_HOLIDAYS) {
        holidayBatch.set(doc(db, HOLIDAYS_COL, hol.id), hol);
      }
      await holidayBatch.commit();
      sessionDbMetrics.writes += INITIAL_HOLIDAYS.length;
    }
    localStorage.setItem('zt_holidays_seeded_v3', 'true');
  } catch (error) {
    console.warn('Initial Firestore seed skipped or offline:', error);
  }
}

export interface CloudSnapshotData {
  users: User[];
  attendance: AttendanceRecord[];
  exceptions: AttendanceException[];
  holidays?: Holiday[];
  settings?: NotificationSettings | null;
  readCount: number;
}

/**
 * One-Shot Targeted Cloud Fetch:
 * Fetches only active business entities (Users, Attendance, Exceptions) on demand.
 * Completely avoids continuous onSnapshot stream listeners to guarantee < 100 calls/day.
 */
export async function fetchCloudDataSnapshot(): Promise<CloudSnapshotData> {
  const [usersSnap, attendanceSnap, exceptionsSnap] = await Promise.all([
    getDocs(collection(db, USERS_COL)),
    getDocs(collection(db, ATTENDANCE_COL)),
    getDocs(collection(db, EXCEPTIONS_COL))
  ]);

  const totalReads = usersSnap.size + attendanceSnap.size + exceptionsSnap.size;
  sessionDbMetrics.reads += totalReads;

  const allUsers = usersSnap.docs.map(d => d.data() as User);
  const realUsers = allUsers.filter(
    u => !u.id.startsWith('user-emp-') && u.id !== 'user-admin-main'
  );

  const allRecords = attendanceSnap.docs.map(d => d.data() as AttendanceRecord);
  const realRecords = allRecords.filter(
    r => !r.employee_id.startsWith('user-emp-') && r.employee_id !== 'user-admin-main' && !r.id.startsWith('att-oct-') && !r.id.startsWith('att-sep-')
  );
  realRecords.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

  const allExceptions = exceptionsSnap.docs.map(d => d.data() as AttendanceException);
  const realExceptions = allExceptions.filter(
    e => !e.employee_id.startsWith('user-emp-') && e.employee_id !== 'user-admin-main'
  );

  return {
    users: realUsers,
    attendance: realRecords,
    exceptions: realExceptions,
    readCount: totalReads
  };
}

/**
 * Fetch holidays on demand (infrequently needed since holidays are fixed calendar events)
 */
export async function fetchCloudHolidays(): Promise<Holiday[]> {
  try {
    const snap = await getDocs(collection(db, HOLIDAYS_COL));
    sessionDbMetrics.reads += snap.size;
    if (snap.empty) {
      return INITIAL_HOLIDAYS;
    }
    return snap.docs.map(d => d.data() as Holiday);
  } catch (error) {
    console.warn('Failed to fetch holidays from Firestore, using initial:', error);
    return INITIAL_HOLIDAYS;
  }
}

/**
 * Fetch notification settings on demand (single document read)
 */
export async function fetchCloudNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID));
    sessionDbMetrics.reads += 1;
    if (snap.exists()) {
      return snap.data() as NotificationSettings;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch settings from Firestore:', error);
    return null;
  }
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

// User CRUD - exactly 1 write/delete per action
export async function fsSaveUser(user: User): Promise<void> {
  const path = `${USERS_COL}/${user.id}`;
  try {
    await setDoc(doc(db, USERS_COL, user.id), cleanForFirestore(user));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsUpdateUser(id: string, updates: Partial<User>): Promise<void> {
  const path = `${USERS_COL}/${id}`;
  try {
    await updateDoc(doc(db, USERS_COL, id), cleanForFirestore(updates));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsDeleteUser(id: string): Promise<void> {
  const path = `${USERS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, USERS_COL, id));
    sessionDbMetrics.deletes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Attendance CRUD - exactly 1 write per punch
export async function fsSaveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const path = `${ATTENDANCE_COL}/${record.id}`;
  try {
    await setDoc(doc(db, ATTENDANCE_COL, record.id), cleanForFirestore(record));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Exceptions CRUD - exactly 1 write/delete per leave/WFH request
export async function fsSaveException(exception: AttendanceException): Promise<void> {
  const path = `${EXCEPTIONS_COL}/${exception.id}`;
  try {
    await setDoc(doc(db, EXCEPTIONS_COL, exception.id), cleanForFirestore(exception));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsDeleteException(id: string): Promise<void> {
  const path = `${EXCEPTIONS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, EXCEPTIONS_COL, id));
    sessionDbMetrics.deletes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Holidays CRUD
export async function fsSaveHoliday(holiday: Holiday): Promise<void> {
  const path = `${HOLIDAYS_COL}/${holiday.id}`;
  try {
    await setDoc(doc(db, HOLIDAYS_COL, holiday.id), cleanForFirestore(holiday));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsUpdateHoliday(id: string, updates: Partial<Holiday>): Promise<void> {
  const path = `${HOLIDAYS_COL}/${id}`;
  try {
    await updateDoc(doc(db, HOLIDAYS_COL, id), cleanForFirestore(updates));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsDeleteHoliday(id: string): Promise<void> {
  const path = `${HOLIDAYS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, HOLIDAYS_COL, id));
    sessionDbMetrics.deletes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Audit Logs CRUD - saved quietly without triggering reactive listeners
export async function fsSaveAuditLog(log: AuditLog): Promise<void> {
  const path = `${AUDIT_LOGS_COL}/${log.id}`;
  try {
    await setDoc(doc(db, AUDIT_LOGS_COL, log.id), cleanForFirestore(log));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    // Non-blocking log save
    console.debug('Audit log save notice:', error);
  }
}

export async function fsSaveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const path = `${SETTINGS_COL}/${NOTIFICATION_DOC_ID}`;
  try {
    await setDoc(doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID), cleanForFirestore(settings));
    sessionDbMetrics.writes += 1;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
