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
import { INITIAL_HOLIDAYS } from '../data/seedData';
import {
  AttendanceException,
  AttendanceRecord,
  AuditLog,
  Holiday,
  NotificationSettings,
  User
} from '../types';
import {
  assertWithinDailyQuota,
  checkSharedSyncState,
  isCircuitBreakerLocked,
  isFirestoreQuotaError,
  QuotaCircuitBreakerError,
  recordFirestoreUsage,
  tripCircuitBreaker
} from './circuitBreaker';
import { db, handleFirestoreError, OperationType } from './firebase';

const USERS_COL = 'users';
const ATTENDANCE_COL = 'attendance';
const EXCEPTIONS_COL = 'exceptions';
const HOLIDAYS_COL = 'holidays';
const AUDIT_LOGS_COL = 'audit_logs';
const SETTINGS_COL = 'settings';
const NOTIFICATION_DOC_ID = 'notification_settings';

// Lightweight in-memory session counter for DB hits
export const sessionDbMetrics = {
  reads: 0,
  writes: 0,
  deletes: 0
};

// Seed festival holidays only if never seeded before
export async function seedInitialDataIfEmpty() {
  try {
    if (isCircuitBreakerLocked()) {
      return;
    }

    const hasSeededLocally = localStorage.getItem('zt_holidays_seeded_v3');
    if (hasSeededLocally === 'true') {
      return;
    }

    assertWithinDailyQuota('read');
    const holidaysSnap = await getDocs(collection(db, HOLIDAYS_COL));
    const readHits = Math.max(1, holidaysSnap.size);
    sessionDbMetrics.reads += readHits;

    let writeHits = 0;
    if (holidaysSnap.empty) {
      assertWithinDailyQuota('write');
      const holidayBatch = writeBatch(db);
      for (const hol of INITIAL_HOLIDAYS) {
        holidayBatch.set(doc(db, HOLIDAYS_COL, hol.id), hol);
      }
      await holidayBatch.commit();
      writeHits = INITIAL_HOLIDAYS.length;
      sessionDbMetrics.writes += writeHits;
    }
    recordFirestoreUsage(db, readHits, writeHits);
    localStorage.setItem('zt_holidays_seeded_v3', 'true');
  } catch (error) {
    if (error instanceof QuotaCircuitBreakerError) {
      return;
    }
    if (isFirestoreQuotaError(error)) {
      await tripCircuitBreaker(db, 'Firebase daily quota limit exceeded');
      return;
    }
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
 * Protected by the App-Level 50K/Day Hard-Stop Circuit Breaker.
 */
export async function fetchCloudDataSnapshot(checkSharedLock: boolean = false): Promise<CloudSnapshotData> {
  assertWithinDailyQuota('read');

  // Verify shared appMeta/syncState before reading large collections when explicitly requested
  await checkSharedSyncState(db, checkSharedLock);
  assertWithinDailyQuota('read');

  try {
    const [usersSnap, attendanceSnap, exceptionsSnap, holidaysSnap, settingsSnap] = await Promise.all([
      getDocs(collection(db, USERS_COL)),
      getDocs(collection(db, ATTENDANCE_COL)),
      getDocs(collection(db, EXCEPTIONS_COL)),
      getDocs(collection(db, HOLIDAYS_COL)),
      getDoc(doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID))
    ]);

    const totalReads =
      usersSnap.size +
      attendanceSnap.size +
      exceptionsSnap.size +
      holidaysSnap.size +
      1;
    sessionDbMetrics.reads += totalReads;
    recordFirestoreUsage(db, totalReads, 0, true);

    const allUsers = usersSnap.docs.map(d => ({ ...(d.data() as User), id: (d.data() as User).id || d.id }));
    const realUsers = allUsers.filter(
      u => !u.id.startsWith('user-emp-') && u.id !== 'user-admin-main'
    );

    const allRecords = attendanceSnap.docs.map(d => ({ ...(d.data() as AttendanceRecord), id: (d.data() as AttendanceRecord).id || d.id }));
    const realRecords = allRecords.filter(
      r =>
        !r.employee_id.startsWith('user-emp-') &&
        r.employee_id !== 'user-admin-main' &&
        !r.id.startsWith('att-oct-') &&
        !r.id.startsWith('att-sep-')
    );
    realRecords.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));

    const allExceptions = exceptionsSnap.docs.map(d => ({ ...(d.data() as AttendanceException), id: (d.data() as AttendanceException).id || d.id }));
    const filteredExceptions = allExceptions
      .filter(e => !e.employee_id.startsWith('user-emp-') && e.employee_id !== 'user-admin-main')
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));

    // Keep the newest exception per (employee_id, date) so old superseded requests don't shadow new ones
    const seenExceptionKeys = new Set<string>();
    const realExceptions: AttendanceException[] = [];
    for (const exc of filteredExceptions) {
      const key = `${exc.employee_id}__${exc.date}`;
      if (!seenExceptionKeys.has(key)) {
        seenExceptionKeys.add(key);
        realExceptions.push(exc);
      }
    }

    const cloudHolidays = !holidaysSnap.empty
      ? holidaysSnap.docs.map(d => ({ ...(d.data() as Holiday), id: (d.data() as Holiday).id || d.id }))
      : undefined;

    const cloudSettings = settingsSnap.exists()
      ? (settingsSnap.data() as NotificationSettings)
      : null;

    return {
      users: realUsers,
      attendance: realRecords,
      exceptions: realExceptions,
      holidays: cloudHolidays,
      settings: cloudSettings,
      readCount: totalReads
    };
  } catch (error) {
    if (error instanceof QuotaCircuitBreakerError) {
      throw error;
    }
    if (isFirestoreQuotaError(error)) {
      await tripCircuitBreaker(db, 'Firebase daily read quota exceeded');
      throw new QuotaCircuitBreakerError(
        {
          datePt: '',
          readUnits: 50000,
          writeUnits: 0,
          locked: true,
          lockReason: 'Daily 50K limit reached — paused until midnight PT',
          updatedAt: new Date().toISOString()
        },
        'Daily 50K limit reached — paused until midnight PT'
      );
    }
    throw error;
  }
}

/**
 * Fetch holidays on demand
 */
export async function fetchCloudHolidays(): Promise<Holiday[]> {
  try {
    assertWithinDailyQuota('read');
    const snap = await getDocs(collection(db, HOLIDAYS_COL));
    const reads = Math.max(1, snap.size);
    sessionDbMetrics.reads += reads;
    recordFirestoreUsage(db, reads, 0);
    if (snap.empty) {
      return INITIAL_HOLIDAYS;
    }
    return snap.docs.map(d => d.data() as Holiday);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      await tripCircuitBreaker(db, 'Firebase daily read quota exceeded');
    }
    console.warn('Failed to fetch holidays from Firestore, using initial:', error);
    return INITIAL_HOLIDAYS;
  }
}

/**
 * Fetch notification settings on demand (single document read)
 */
export async function fetchCloudNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    assertWithinDailyQuota('read');
    const snap = await getDoc(doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID));
    sessionDbMetrics.reads += 1;
    recordFirestoreUsage(db, 1, 0);
    if (snap.exists()) {
      return snap.data() as NotificationSettings;
    }
    return null;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      await tripCircuitBreaker(db, 'Firebase daily read quota exceeded');
    }
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

async function guardedWriteOperation(
  path: string,
  operationType: OperationType,
  operation: () => Promise<void>,
  isDelete: boolean = false
): Promise<void> {
  assertWithinDailyQuota('write');
  try {
    await operation();
    if (isDelete) {
      sessionDbMetrics.deletes += 1;
    } else {
      sessionDbMetrics.writes += 1;
    }
    recordFirestoreUsage(db, 0, 1);
  } catch (error) {
    if (error instanceof QuotaCircuitBreakerError) {
      throw error;
    }
    if (isFirestoreQuotaError(error)) {
      await tripCircuitBreaker(db, 'Firebase daily write quota exceeded');
    }
    handleFirestoreError(error, operationType, path);
  }
}

// User CRUD - guarded by 50K/40K circuit breaker
export async function fsSaveUser(user: User): Promise<void> {
  const path = `${USERS_COL}/${user.id}`;
  await guardedWriteOperation(path, OperationType.WRITE, () =>
    setDoc(doc(db, USERS_COL, user.id), cleanForFirestore(user))
  );
}

export async function fsUpdateUser(id: string, updates: Partial<User>): Promise<void> {
  const path = `${USERS_COL}/${id}`;
  await guardedWriteOperation(path, OperationType.UPDATE, () =>
    updateDoc(doc(db, USERS_COL, id), cleanForFirestore(updates))
  );
}

export async function fsDeleteUser(id: string): Promise<void> {
  const path = `${USERS_COL}/${id}`;
  await guardedWriteOperation(
    path,
    OperationType.DELETE,
    () => deleteDoc(doc(db, USERS_COL, id)),
    true
  );
}

// Attendance CRUD - guarded by 50K/40K circuit breaker
export async function fsSaveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const path = `${ATTENDANCE_COL}/${record.id}`;
  await guardedWriteOperation(path, OperationType.WRITE, () =>
    setDoc(doc(db, ATTENDANCE_COL, record.id), cleanForFirestore(record))
  );
}

// Exceptions CRUD - guarded by 50K/40K circuit breaker
export async function fsSaveException(exception: AttendanceException): Promise<void> {
  const path = `${EXCEPTIONS_COL}/${exception.id}`;
  await guardedWriteOperation(path, OperationType.WRITE, () =>
    setDoc(doc(db, EXCEPTIONS_COL, exception.id), cleanForFirestore(exception))
  );
}

export async function fsDeleteException(id: string): Promise<void> {
  const path = `${EXCEPTIONS_COL}/${id}`;
  await guardedWriteOperation(
    path,
    OperationType.DELETE,
    () => deleteDoc(doc(db, EXCEPTIONS_COL, id)),
    true
  );
}

// Holidays CRUD - guarded by 50K/40K circuit breaker
export async function fsSaveHoliday(holiday: Holiday): Promise<void> {
  const path = `${HOLIDAYS_COL}/${holiday.id}`;
  await guardedWriteOperation(path, OperationType.WRITE, () =>
    setDoc(doc(db, HOLIDAYS_COL, holiday.id), cleanForFirestore(holiday))
  );
}

export async function fsUpdateHoliday(id: string, updates: Partial<Holiday>): Promise<void> {
  const path = `${HOLIDAYS_COL}/${id}`;
  await guardedWriteOperation(path, OperationType.UPDATE, () =>
    updateDoc(doc(db, HOLIDAYS_COL, id), cleanForFirestore(updates))
  );
}

export async function fsDeleteHoliday(id: string): Promise<void> {
  const path = `${HOLIDAYS_COL}/${id}`;
  await guardedWriteOperation(
    path,
    OperationType.DELETE,
    () => deleteDoc(doc(db, HOLIDAYS_COL, id)),
    true
  );
}

// Audit Logs CRUD - guarded by 50K/40K circuit breaker
export async function fsSaveAuditLog(log: AuditLog): Promise<void> {
  try {
    assertWithinDailyQuota('write');
    await setDoc(doc(db, AUDIT_LOGS_COL, log.id), cleanForFirestore(log));
    sessionDbMetrics.writes += 1;
    recordFirestoreUsage(db, 0, 1);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      await tripCircuitBreaker(db, 'Firebase daily write quota exceeded');
    }
    console.debug('Audit log save blocked or notice:', error);
  }
}

export async function fsSaveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const path = `${SETTINGS_COL}/${NOTIFICATION_DOC_ID}`;
  await guardedWriteOperation(path, OperationType.WRITE, () =>
    setDoc(doc(db, SETTINGS_COL, NOTIFICATION_DOC_ID), cleanForFirestore(settings))
  );
}
