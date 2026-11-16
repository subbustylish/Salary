import {
  doc,
  Firestore,
  getDocFromServer,
  runTransaction,
  setDoc
} from 'firebase/firestore';

export const DAILY_READ_LIMIT = 50_000;
export const DAILY_WRITE_LIMIT = 40_000;

export const APP_META_COLLECTION = 'appMeta';
export const SYNC_STATE_DOC_ID = 'syncState';
const STORAGE_KEY = 'zt_quota_circuit_breaker_v1';

export interface SyncQuotaState {
  datePt: string; // YYYY-MM-DD in America/Los_Angeles (Pacific Time)
  readUnits: number;
  writeUnits: number;
  locked: boolean;
  lockReason: string | null;
  updatedAt: string;
}

export class QuotaCircuitBreakerError extends Error {
  public readonly state: SyncQuotaState;

  constructor(state: SyncQuotaState, customMessage?: string) {
    super(
      customMessage ||
        'Daily 50K limit reached — paused until midnight PT'
    );
    this.name = 'QuotaCircuitBreakerError';
    this.state = state;
  }
}

/**
 * Returns today's date string (YYYY-MM-DD) in Pacific Time (America/Los_Angeles),
 * matching Firebase's midnight PT daily quota reset boundary.
 */
export function getCurrentPacificDateStr(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    // Fallback if Intl timezone database is unavailable: UTC-8 approximation
    const ptApprox = new Date(date.getTime() - 8 * 60 * 60 * 1000);
    return ptApprox.toISOString().slice(0, 10);
  }
}

/**
 * Computes human-readable time remaining until midnight PT.
 */
export function getTimeUntilMidnightPT(): string {
  try {
    const now = new Date();
    const ptParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(now);

    const hourPart = Number(ptParts.find(p => p.type === 'hour')?.value ?? '0');
    const minPart = Number(ptParts.find(p => p.type === 'minute')?.value ?? '0');
    const normalizedHour = hourPart === 24 ? 0 : hourPart;
    const minsRemainingTotal = Math.max(1, 24 * 60 - (normalizedHour * 60 + minPart));
    const hrs = Math.floor(minsRemainingTotal / 60);
    const mins = minsRemainingTotal % 60;
    return `${hrs}h ${mins}m`;
  } catch {
    return 'midnight PT';
  }
}

function createFreshState(datePt: string = getCurrentPacificDateStr()): SyncQuotaState {
  return {
    datePt,
    readUnits: 0,
    writeUnits: 0,
    locked: false,
    lockReason: null,
    updatedAt: new Date().toISOString()
  };
}

function loadCachedState(): SyncQuotaState {
  const todayPt = getCurrentPacificDateStr();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFreshState(todayPt);
    const parsed = JSON.parse(raw) as Partial<SyncQuotaState>;
    // Automatically reset at midnight PT
    if (!parsed || parsed.datePt !== todayPt) {
      const fresh = createFreshState(todayPt);
      saveCachedState(fresh);
      return fresh;
    }
    const readUnits = Math.max(0, Math.round(Number(parsed.readUnits || 0)));
    const writeUnits = Math.max(0, Math.round(Number(parsed.writeUnits || 0)));
    const locked =
      Boolean(parsed.locked) ||
      readUnits >= DAILY_READ_LIMIT ||
      writeUnits >= DAILY_WRITE_LIMIT;
    return {
      datePt: todayPt,
      readUnits,
      writeUnits,
      locked,
      lockReason:
        parsed.lockReason ||
        (readUnits >= DAILY_READ_LIMIT
          ? 'Daily 50,000 Read Units limit reached'
          : writeUnits >= DAILY_WRITE_LIMIT
          ? 'Daily 40,000 Write Units limit reached'
          : null),
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return createFreshState(todayPt);
  }
}

function saveCachedState(state: SyncQuotaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors in restricted browsing modes
  }
}

type CircuitListener = (state: SyncQuotaState) => void;
const listeners = new Set<CircuitListener>();

let currentState: SyncQuotaState = loadCachedState();
let pendingReadsDelta = 0;
let pendingWritesDelta = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let hasCheckedServerThisSession = false;

function notifyListeners() {
  const snapshot = getCircuitBreakerState();
  listeners.forEach(fn => {
    try {
      fn(snapshot);
    } catch {
      // Ignore subscriber error
    }
  });
}

// Listen for cross-tab localStorage updates in the same browser
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      currentState = loadCachedState();
      notifyListeners();
    }
  });
}

export function subscribeToCircuitBreaker(listener: CircuitListener): () => void {
  listeners.add(listener);
  listener(getCircuitBreakerState());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Pure local check (0 Firestore reads).
 * Automatically resets counters if Pacific Time has crossed midnight.
 */
export function getCircuitBreakerState(): SyncQuotaState {
  const todayPt = getCurrentPacificDateStr();
  if (currentState.datePt !== todayPt) {
    currentState = createFreshState(todayPt);
    pendingReadsDelta = 0;
    pendingWritesDelta = 0;
    hasCheckedServerThisSession = false;
    saveCachedState(currentState);
  }
  return { ...currentState };
}

export function isCircuitBreakerLocked(): boolean {
  const state = getCircuitBreakerState();
  return (
    state.locked ||
    state.readUnits >= DAILY_READ_LIMIT ||
    state.writeUnits >= DAILY_WRITE_LIMIT
  );
}

/**
 * Guard called before EVERY Firestore read, upload, or write.
 * Costs 0 Firestore reads by checking cached appMeta/syncState state.
 */
export function assertWithinDailyQuota(operation: 'read' | 'write'): void {
  const state = getCircuitBreakerState();
  if (
    state.locked ||
    state.readUnits >= DAILY_READ_LIMIT ||
    state.writeUnits >= DAILY_WRITE_LIMIT
  ) {
    throw new QuotaCircuitBreakerError(
      state,
      `Daily 50K limit reached — paused until midnight PT (${operation} blocked).`
    );
  }
}

function applyServerSyncState(serverData: Partial<SyncQuotaState> | undefined): SyncQuotaState {
  const todayPt = getCurrentPacificDateStr();
  if (!serverData || serverData.datePt !== todayPt) {
    // New PT day or uninitialized document
    const localState = getCircuitBreakerState();
    saveCachedState(localState);
    notifyListeners();
    return localState;
  }

  const serverReads = Math.max(0, Math.round(Number(serverData.readUnits || 0)));
  const serverWrites = Math.max(0, Math.round(Number(serverData.writeUnits || 0)));
  const local = getCircuitBreakerState();

  const mergedReads = Math.max(local.readUnits, serverReads);
  const mergedWrites = Math.max(local.writeUnits, serverWrites);
  const locked =
    Boolean(serverData.locked) ||
    local.locked ||
    mergedReads >= DAILY_READ_LIMIT ||
    mergedWrites >= DAILY_WRITE_LIMIT;

  const lockReason = locked
    ? serverData.lockReason ||
      local.lockReason ||
      (mergedReads >= DAILY_READ_LIMIT
        ? 'Daily 50,000 Read Units limit reached'
        : 'Daily 40,000 Write Units limit reached')
    : null;

  currentState = {
    datePt: todayPt,
    readUnits: mergedReads,
    writeUnits: mergedWrites,
    locked,
    lockReason,
    updatedAt: serverData.updatedAt || new Date().toISOString()
  };

  saveCachedState(currentState);
  notifyListeners();
  return { ...currentState };
}

/**
 * Reads shared `appMeta/syncState` on boot (replacing legacy test/connection probe, 0 net extra reads)
 * or once per session before a full cloud sync. Skips completely (0 reads) if already locked locally.
 */
export async function checkSharedSyncState(db: Firestore, forceServerCheck: boolean = false): Promise<SyncQuotaState> {
  const local = getCircuitBreakerState();
  if (local.locked) {
    return local;
  }

  if (hasCheckedServerThisSession && !forceServerCheck) {
    return local;
  }

  try {
    const syncRef = doc(db, APP_META_COLLECTION, SYNC_STATE_DOC_ID);
    const snap = await getDocFromServer(syncRef);
    hasCheckedServerThisSession = true;

    // Count this 1 read locally
    recordLocalOnlyDelta(1, 0);

    if (snap.exists()) {
      return applyServerSyncState(snap.data() as Partial<SyncQuotaState>);
    }
    return getCircuitBreakerState();
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      await tripCircuitBreaker(db, 'Firebase daily quota limit exceeded');
    }
    return getCircuitBreakerState();
  }
}

function recordLocalOnlyDelta(reads: number, writes: number): void {
  const todayPt = getCurrentPacificDateStr();
  const state = getCircuitBreakerState();
  const nextReads = Math.max(0, Math.round(state.readUnits + reads));
  const nextWrites = Math.max(0, Math.round(state.writeUnits + writes));
  const shouldLock =
    state.locked ||
    nextReads >= DAILY_READ_LIMIT ||
    nextWrites >= DAILY_WRITE_LIMIT;

  currentState = {
    datePt: todayPt,
    readUnits: nextReads,
    writeUnits: nextWrites,
    locked: shouldLock,
    lockReason: shouldLock
      ? state.lockReason ||
        (nextReads >= DAILY_READ_LIMIT
          ? 'Daily 50,000 Read Units limit reached'
          : 'Daily 40,000 Write Units limit reached')
      : null,
    updatedAt: new Date().toISOString()
  };
  saveCachedState(currentState);
  notifyListeners();
}

/**
 * Records read/write units after a Firestore call and syncs combined daily totals
 * to shared `appMeta/syncState` so all browsers enforce the 50K/40K hard-stop lock.
 */
export function recordFirestoreUsage(
  db: Firestore,
  readsDelta: number,
  writesDelta: number,
  flushImmediately: boolean = false
): void {
  if (readsDelta <= 0 && writesDelta <= 0) return;

  const wasLocked = isCircuitBreakerLocked();
  recordLocalOnlyDelta(readsDelta, writesDelta);
  pendingReadsDelta += Math.max(0, Math.round(readsDelta));
  pendingWritesDelta += Math.max(0, Math.round(writesDelta));

  const nowLocked = isCircuitBreakerLocked();

  if ((!wasLocked && nowLocked) || flushImmediately) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushUsageToSharedSyncState(db, !wasLocked && nowLocked);
    return;
  }

  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushUsageToSharedSyncState(db, false);
  }, 2500);
}

/**
 * Atomically merges pending usage into `appMeta/syncState`.
 * If combined daily usage across all users reaches >= 50,000 reads or >= 40,000 writes,
 * locks `appMeta/syncState` for all browsers until midnight PT.
 */
export async function flushUsageToSharedSyncState(
  db: Firestore,
  forceLockWrite: boolean = false
): Promise<void> {
  if (isFlushing) return;
  const rDelta = pendingReadsDelta;
  const wDelta = pendingWritesDelta;
  if (rDelta <= 0 && wDelta <= 0 && !forceLockWrite) return;

  // If already locked on server and not transitioning to lock state right now, do not hit Firestore
  if (currentState.locked && !forceLockWrite) {
    pendingReadsDelta = 0;
    pendingWritesDelta = 0;
    return;
  }

  isFlushing = true;
  pendingReadsDelta = 0;
  pendingWritesDelta = 0;

  try {
    const todayPt = getCurrentPacificDateStr();
    const syncRef = doc(db, APP_META_COLLECTION, SYNC_STATE_DOC_ID);

    const updated = await runTransaction(db, async tx => {
      const snap = await tx.get(syncRef);
      const data = snap.exists() ? (snap.data() as Partial<SyncQuotaState>) : null;
      const isSamePtDay = data?.datePt === todayPt;

      const baseReads = isSamePtDay ? Math.max(0, Math.round(Number(data?.readUnits || 0))) : 0;
      const baseWrites = isSamePtDay ? Math.max(0, Math.round(Number(data?.writeUnits || 0))) : 0;
      const alreadyLocked = isSamePtDay && Boolean(data?.locked);

      const nextReads = Math.round(baseReads + rDelta + 1);
      const nextWrites = Math.round(baseWrites + wDelta + 1);
      const locked =
        alreadyLocked ||
        forceLockWrite ||
        nextReads >= DAILY_READ_LIMIT ||
        nextWrites >= DAILY_WRITE_LIMIT;

      const lockReason = locked
        ? (isSamePtDay ? data?.lockReason : null) ||
          currentState.lockReason ||
          (nextReads >= DAILY_READ_LIMIT
            ? 'Daily 50,000 Read Units limit reached'
            : 'Daily 40,000 Write Units limit reached')
        : null;

      const nextDoc: SyncQuotaState = {
        datePt: todayPt,
        readUnits: nextReads,
        writeUnits: nextWrites,
        locked,
        lockReason,
        updatedAt: new Date().toISOString()
      };

      tx.set(syncRef, nextDoc);
      return nextDoc;
    });

    currentState = updated;
    hasCheckedServerThisSession = true;
    saveCachedState(currentState);
    notifyListeners();
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      await tripCircuitBreaker(db, 'Daily Firebase quota exhausted');
    } else {
      console.debug('Deferred syncState update notice:', err);
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Trips the 50K/40K Hard-Stop Circuit Breaker locally and persists `locked: true`
 * to `appMeta/syncState` (best-effort) so all connected browsers pause until midnight PT.
 */
export async function tripCircuitBreaker(
  db: Firestore,
  reason: string = 'Daily 50,000 Read Units limit reached'
): Promise<void> {
  const todayPt = getCurrentPacificDateStr();
  const prev = getCircuitBreakerState();
  const nextState: SyncQuotaState = {
    datePt: todayPt,
    readUnits: Math.max(prev.readUnits, DAILY_READ_LIMIT),
    writeUnits: prev.writeUnits,
    locked: true,
    lockReason: reason,
    updatedAt: new Date().toISOString()
  };

  currentState = nextState;
  saveCachedState(nextState);
  notifyListeners();

  try {
    await setDoc(doc(db, APP_META_COLLECTION, SYNC_STATE_DOC_ID), nextState);
  } catch {
    // If Firestore itself is already rejecting writes due to quota, local lock remains active until midnight PT
  }
}

export function isFirestoreQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: string })?.code?.toLowerCase() || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily read units') ||
    msg.includes('quota limit exceeded')
  );
}
