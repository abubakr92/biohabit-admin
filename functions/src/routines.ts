import type { Query } from 'firebase-admin/firestore';
import { db } from './firebase';
import { HttpError, getStack, getUser, listContextRows } from './store';
import type { Bilingual, DayActivity, Mode } from './types';

// Member-owned routines, written by the mobile app. This panel only ever reads them: there is no
// create, update or delete route anywhere, and none should be added.
const COLLECTIONS = { routines: 'routines', routineActions: 'routineActions', users: 'users', checkOffs: 'checkOffs' } as const;
const DAY_MS = 86_400_000;

export type RoutineSource = 'template' | 'custom';
export type RoutineStatus = 'active' | 'inactive' | 'expired';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export interface UserRoutine { id: string; userId: string; userEmail: string; title: string; description: string; source: RoutineSource; sourceStackId: string | null; sourceStackTitle: string | null; mode: Mode; weekdays: Weekday[]; startDate: string; endDate: string | null; anchorTime: string | null; notificationOn: boolean; status: RoutineStatus; actionCount: number; createdAt: string; updatedAt: string }
export interface UserRoutineAction { id: string; routineId: string; microActionId: string; microActionTitle: Bilingual; sortOrder: number; startTime: string | null; durationMin: number; includedInMode: Mode; isActive: boolean; isUserAdded: boolean }
export interface RoutineDivergence { nameChanged: boolean; actionsAdded: number; actionsRemoved: number; orderChanged: boolean; timesChanged: number }
export interface RoutineSummary { total: number; fromTemplate: number; custom: number; averageActions: number }

/** App-written fields arrive as Timestamps; panel-written ones as ISO strings. */
function isoOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const stamp = value as { toDate?: () => Date; _seconds?: number };
  if (typeof stamp.toDate === 'function') return stamp.toDate().toISOString();
  if (typeof stamp._seconds === 'number') return new Date(stamp._seconds * 1000).toISOString();
  return null;
}

function asRoutine(document: FirebaseFirestore.DocumentSnapshot): UserRoutine {
  const data = (document.data() ?? {}) as Record<string, unknown>;
  return {
    id: document.id,
    userId: String(data.userId ?? ''),
    userEmail: String(data.userEmail ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    source: (data.source as RoutineSource) ?? (data.sourceStackId ? 'template' : 'custom'),
    sourceStackId: (data.sourceStackId as string) ?? null,
    sourceStackTitle: (data.sourceStackTitle as string) ?? null,
    mode: (data.mode as Mode) ?? 'essential',
    weekdays: (data.weekdays as Weekday[]) ?? [],
    startDate: isoOf(data.startDate) ?? '',
    endDate: isoOf(data.endDate),
    anchorTime: (data.anchorTime as string) ?? null,
    notificationOn: data.notificationOn === true,
    status: (data.status as RoutineStatus) ?? 'active',
    actionCount: typeof data.actionCount === 'number' ? data.actionCount : 0,
    createdAt: isoOf(data.createdAt) ?? '',
    updatedAt: isoOf(data.updatedAt) ?? isoOf(data.createdAt) ?? '',
  };
}

function asRoutineAction(document: FirebaseFirestore.DocumentSnapshot): UserRoutineAction {
  const data = (document.data() ?? {}) as Record<string, unknown>;
  return {
    id: document.id,
    routineId: String(data.routineId ?? ''),
    microActionId: String(data.microActionId ?? ''),
    microActionTitle: (data.microActionTitle as Bilingual) ?? { nl: '', en: '' },
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    startTime: (data.startTime as string) ?? null,
    durationMin: typeof data.durationMin === 'number' ? data.durationMin : 0,
    includedInMode: (data.includedInMode as Mode) ?? 'essential',
    isActive: data.isActive !== false,
    isUserAdded: data.isUserAdded === true,
  };
}

/** Fills in actionCount from routineActions when the routine document does not carry one. */
async function withActionCounts(routines: UserRoutine[]): Promise<UserRoutine[]> {
  const missing = routines.filter((routine) => !routine.actionCount).map((routine) => routine.id);
  if (!missing.length) return routines;
  const counts = new Map<string, number>();
  await Promise.all(
    missing.map(async (routineId) => {
      const total = await db.collection(COLLECTIONS.routineActions).where('routineId', '==', routineId).count().get();
      counts.set(routineId, total.data().count);
    }),
  );
  return routines.map((routine) => ({ ...routine, actionCount: routine.actionCount || counts.get(routine.id) || 0 }));
}

export async function listRoutines(filters: { search?: string; source?: string; status?: string; mode?: string; userId?: string }) {
  let query: Query = db.collection(COLLECTIONS.routines);
  if (filters.userId) query = query.where('userId', '==', filters.userId);
  if (filters.status) query = query.where('status', '==', filters.status);
  const snapshot = await query.get();
  const search = (filters.search ?? '').toLowerCase();
  const routines = await withActionCounts(snapshot.docs.map(asRoutine));
  const matching = routines
    .filter(
      (routine) =>
        (!search || `${routine.title} ${routine.userEmail}`.toLowerCase().includes(search)) &&
        (!filters.source || routine.source === filters.source) &&
        (!filters.mode || routine.mode === filters.mode),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const fromTemplate = matching.filter((routine) => routine.source === 'template').length;
  const summary: RoutineSummary = {
    total: matching.length,
    fromTemplate,
    custom: matching.length - fromTemplate,
    averageActions: matching.length
      ? Math.round((matching.reduce((sum, routine) => sum + routine.actionCount, 0) / matching.length) * 10) / 10
      : 0,
  };
  return { routines: matching, summary };
}

export async function getRoutine(id: string): Promise<UserRoutine> {
  const snapshot = await db.collection(COLLECTIONS.routines).doc(id).get();
  if (!snapshot.exists) throw new HttpError(404, 'Routine not found.');
  return (await withActionCounts([asRoutine(snapshot)]))[0];
}

export async function listRoutineActions(routineId: string): Promise<UserRoutineAction[]> {
  await getRoutine(routineId);
  const snapshot = await db.collection(COLLECTIONS.routineActions).where('routineId', '==', routineId).get();
  return snapshot.docs.map(asRoutineAction).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listUserRoutines(userId: string): Promise<UserRoutine[]> {
  await getUser(userId);
  const snapshot = await db.collection(COLLECTIONS.routines).where('userId', '==', userId).get();
  const routines = await withActionCounts(snapshot.docs.map(asRoutine));
  return routines.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Diffed against the source stack as it stands now, rather than stored at adoption time, so the
 * panel never reports a change the member did not make. Null for a routine built from scratch.
 */
export async function getRoutineDivergence(id: string): Promise<RoutineDivergence | null> {
  const routine = await getRoutine(id);
  if (routine.source !== 'template' || !routine.sourceStackId) return null;
  const [baselineRows, actions] = await Promise.all([listContextRows(routine.sourceStackId), listRoutineActions(id)]);
  const baseline = baselineRows.map((row) => row.microActionId);
  const current = actions.map((action) => action.microActionId);
  const inherited = current.filter((actionId) => baseline.includes(actionId));
  const baselineOrder = baseline.filter((actionId) => current.includes(actionId));
  const stack = await getStack(routine.sourceStackId).catch(() => null);
  const baselineTime = new Map(baselineRows.map((row) => [row.microActionId, row.startTime]));
  return {
    nameChanged: Boolean(stack && routine.title !== stack.title.en),
    actionsAdded: actions.filter((action) => action.isUserAdded || !baseline.includes(action.microActionId)).length,
    actionsRemoved: baseline.filter((actionId) => !current.includes(actionId)).length,
    // Only the inherited actions' relative order counts; inserting a new one is not a reorder.
    orderChanged: inherited.some((actionId, index) => baselineOrder[index] !== actionId),
    timesChanged: actions.filter(
      (action) => baseline.includes(action.microActionId) && baselineTime.get(action.microActionId) !== action.startTime,
    ).length,
  };
}

/**
 * Steps ticked per day that belong to this routine. Reads the same per-day check-off documents the
 * app already writes, counting only ids that match this routine, so it stays correct whether the
 * app records routine action ids or falls back to stack context rows.
 */
export async function getRoutineCompletion(id: string, days: number): Promise<DayActivity[]> {
  const routine = await getRoutine(id);
  const actions = await listRoutineActions(id);
  const owned = new Set<string>([...actions.map((action) => action.id), ...actions.map((action) => action.microActionId)]);
  const cutoff = new Date(Date.now() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  const snapshot = await db
    .collection(COLLECTIONS.users)
    .doc(routine.userId)
    .collection(COLLECTIONS.checkOffs)
    .where('day', '>=', cutoff)
    .get();
  const counts = new Map<string, number>();
  snapshot.docs.forEach((document) => {
    const stepIds = ((document.get('stepIds') as string[]) ?? []).filter((stepId) => owned.has(stepId));
    counts.set((document.get('day') as string) ?? document.id, stepIds.length);
  });
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(Date.now() - (days - 1 - offset) * DAY_MS).toISOString().slice(0, 10);
    return { date, stepsCompleted: counts.get(date) ?? 0 };
  });
}
