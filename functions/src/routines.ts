import { db } from './firebase';
import { HttpError, getStack, getUser, listContextRows } from './store';
import type { Bilingual, DayActivity } from './types';

/**
 * Member-owned routines, as the mobile app actually stores them:
 *
 *   users/{uid}/routines/{routineId}   — a subcollection, not a top-level collection
 *   .actions                           — an array field inside that document, not a subcollection
 *
 * Read-only here. The app owns this data; the panel never writes it.
 *
 * Two conventions in the app's data carry meaning and are relied on below:
 *   - an action id prefixed `seed-` came from a stack template, and the remainder is the
 *     `contextRows` id it was copied from. Anything else was added by the member.
 *   - check-off `stepIds` record those same contextRow ids, which is what lets per-routine
 *     completion be matched at all.
 */
const SEED_PREFIX = 'seed-';
const DAY_MS = 86_400_000;

export type RoutineSource = 'template' | 'custom';
export type RoutineStatus = 'active' | 'inactive' | 'expired';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const WEEKDAY_BY_NUMBER: Record<number, Weekday> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' };

export interface UserRoutineAction {
  id: string;
  routineId: string;
  /** Null when the member typed a one-off action rather than picking from the library. */
  microActionId: string | null;
  title: string;
  microActionTitle: Bilingual;
  sortOrder: number;
  startTime: string | null;
  /** The app stores this as free text ("2 min"); both the raw label and a parsed number are given. */
  durationLabel: string | null;
  durationMin: number | null;
  depth: string | null;
  isActive: boolean;
  isUserAdded: boolean;
  /** The contextRows id this action was seeded from, when it came from a template. */
  sourceStepId: string | null;
}

export interface UserRoutine {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  source: RoutineSource;
  sourceStackId: string | null;
  sourceStackTitle: string | null;
  mode: string;
  weekdays: Weekday[];
  repeat: string | null;
  anchorLabel: string | null;
  startsAt: string | null;
  durationMinutes: number | null;
  notificationOn: boolean;
  enabled: boolean;
  status: RoutineStatus;
  actionCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface RoutineDivergence { nameChanged: boolean; actionsAdded: number; actionsRemoved: number; orderChanged: boolean; timesChanged: number }
export interface RoutineSummary { total: number; fromTemplate: number; custom: number; averageActions: number }

/** The app writes epoch millis; earlier data used Timestamps or ISO strings. Accept all three. */
function isoOf(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  const stamp = value as { toDate?: () => Date; _seconds?: number };
  if (typeof stamp.toDate === 'function') return stamp.toDate().toISOString();
  if (typeof stamp._seconds === 'number') return new Date(stamp._seconds * 1000).toISOString();
  return null;
}

/** "2 min" -> 2. Tolerates the app's occasional "4 min min" and returns null when nothing parses. */
function minutesOf(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

const stepIdOf = (actionId: string) => (actionId.startsWith(SEED_PREFIX) ? actionId.slice(SEED_PREFIX.length) : null);

function mapActions(routineId: string, raw: unknown): UserRoutineAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const action = (item ?? {}) as Record<string, unknown>;
    const id = String(action.id ?? `${routineId}-${index}`);
    const title = String(action.title ?? '');
    return {
      id,
      routineId,
      microActionId: (action.microActionId as string) ?? null,
      title,
      // The app keeps a single display string; the panel's shared components expect a pair.
      microActionTitle: { nl: title, en: title },
      sortOrder: index,
      startTime: (action.at as string) ?? null,
      durationLabel: (action.amount as string) ?? null,
      durationMin: minutesOf(action.amount),
      depth: (action.depth as string) ?? null,
      isActive: action.enabled !== false,
      isUserAdded: !id.startsWith(SEED_PREFIX),
      sourceStepId: stepIdOf(id),
    };
  });
}

async function mapRoutine(document: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot, userId: string, userEmail: string): Promise<{ routine: UserRoutine; actions: UserRoutineAction[] }> {
  const data = (document.data() ?? {}) as Record<string, unknown>;
  const actions = mapActions(document.id, data.actions);

  // The template link is not stored; it is recovered from the seeded action ids, each of which
  // carries the contextRows id it was copied from.
  const seeded = actions.map((action) => action.sourceStepId).filter((stepId): stepId is string => Boolean(stepId));
  let sourceStackId: string | null = null;
  let sourceStackTitle: string | null = null;
  if (seeded.length) {
    const rows = await db.getAll(...[...new Set(seeded)].map((stepId) => db.collection('contextRows').doc(stepId)));
    const stackIds = rows.filter((row) => row.exists).map((row) => String(row.get('stackId')));
    sourceStackId = stackIds.sort((a, b) => stackIds.filter((id) => id === b).length - stackIds.filter((id) => id === a).length)[0] ?? null;
    if (sourceStackId) {
      const stack = await db.collection('stacks').doc(sourceStackId).get();
      sourceStackTitle = stack.exists ? String((stack.get('title') as Bilingual)?.en ?? '') : null;
    }
  }

  const weekdayNumbers = Array.isArray(data.weekdays) ? (data.weekdays as number[]) : [];
  const status = String(data.status ?? 'active');
  return {
    routine: {
      id: document.id,
      userId,
      userEmail,
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      source: sourceStackId ? 'template' : 'custom',
      sourceStackId,
      sourceStackTitle,
      mode: String(data.mode ?? 'essential'),
      weekdays: weekdayNumbers.map((number) => WEEKDAY_BY_NUMBER[number]).filter(Boolean),
      repeat: (data.repeat as string) ?? null,
      anchorLabel: (data.anchor as string) ?? null,
      startsAt: (data.startsAt as string) ?? null,
      durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : null,
      notificationOn: data.notificationsEnabled === true,
      enabled: data.enabled !== false,
      // A routine the member switched off reads as inactive regardless of its stored status.
      status: (data.enabled === false ? 'inactive' : status) as RoutineStatus,
      actionCount: actions.length,
      createdAt: isoOf(data.createdAt) ?? '',
      updatedAt: isoOf(data.updatedAt),
    },
    actions,
  };
}

/** Email is shown on the routines list, so it is resolved once per user rather than per routine. */
async function emailLookup(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (!unique.length) return new Map();
  const documents = await db.getAll(...unique.map((userId) => db.collection('users').doc(userId)));
  return new Map(documents.map((document) => [document.id, document.exists ? String(document.get('email') ?? '') : '']));
}

const userIdOf = (document: FirebaseFirestore.DocumentSnapshot) => document.ref.parent.parent?.id ?? '';

export async function listRoutines(filters: { search?: string; source?: string; status?: string; mode?: string; userId?: string }) {
  // Routines live under each user, so listing every member's routines is a collection-group query.
  const snapshot = filters.userId
    ? await db.collection('users').doc(filters.userId).collection('routines').get()
    : await db.collectionGroup('routines').get();
  const emails = await emailLookup(snapshot.docs.map((document) => filters.userId || userIdOf(document)));
  const mapped = await Promise.all(
    snapshot.docs.map((document) => {
      const userId = filters.userId || userIdOf(document);
      return mapRoutine(document, userId, emails.get(userId) ?? '');
    }),
  );
  const search = (filters.search ?? '').toLowerCase();
  const routines = mapped
    .map((entry) => entry.routine)
    .filter(
      (routine) =>
        (!search || `${routine.title} ${routine.userEmail}`.toLowerCase().includes(search)) &&
        (!filters.source || routine.source === filters.source) &&
        (!filters.status || routine.status === filters.status) &&
        (!filters.mode || routine.mode === filters.mode),
    )
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));

  const fromTemplate = routines.filter((routine) => routine.source === 'template').length;
  const summary: RoutineSummary = {
    total: routines.length,
    fromTemplate,
    custom: routines.length - fromTemplate,
    averageActions: routines.length ? Math.round((routines.reduce((sum, routine) => sum + routine.actionCount, 0) / routines.length) * 10) / 10 : 0,
  };
  return { routines, summary };
}

/** Routine ids are unique per user, so a lookup by id alone needs the collection group. */
async function findRoutine(id: string) {
  const matches = await db.collectionGroup('routines').get();
  const document = matches.docs.find((candidate) => candidate.id === id);
  if (!document) throw new HttpError(404, 'Routine not found.');
  const userId = userIdOf(document);
  const emails = await emailLookup([userId]);
  return mapRoutine(document, userId, emails.get(userId) ?? '');
}

export async function getRoutine(id: string): Promise<UserRoutine> {
  return (await findRoutine(id)).routine;
}

export async function listRoutineActions(id: string): Promise<UserRoutineAction[]> {
  return (await findRoutine(id)).actions;
}

export async function listUserRoutines(userId: string): Promise<UserRoutine[]> {
  await getUser(userId);
  const { routines } = await listRoutines({ userId });
  return routines;
}

/**
 * Diffed against the source stack as it stands now, so the panel never reports a change the member
 * did not make. Null for a routine with no template behind it.
 */
export async function getRoutineDivergence(id: string): Promise<RoutineDivergence | null> {
  const { routine, actions } = await findRoutine(id);
  if (!routine.sourceStackId) return null;
  const baselineRows = await listContextRows(routine.sourceStackId);
  const baseline = baselineRows.map((row) => row.id);
  const current = actions.map((action) => action.sourceStepId).filter((stepId): stepId is string => Boolean(stepId));
  const inherited = current.filter((stepId) => baseline.includes(stepId));
  const baselineOrder = baseline.filter((stepId) => current.includes(stepId));
  const stack = await getStack(routine.sourceStackId).catch(() => null);
  const baselineTime = new Map(baselineRows.map((row) => [row.id, row.startTime]));
  return {
    nameChanged: Boolean(stack && routine.title !== stack.title.en),
    actionsAdded: actions.filter((action) => action.isUserAdded).length,
    actionsRemoved: baseline.filter((stepId) => !current.includes(stepId)).length,
    // Only the inherited actions' relative order counts; inserting a new one is not a reorder.
    orderChanged: inherited.some((stepId, index) => baselineOrder[index] !== stepId),
    timesChanged: actions.filter((action) => action.sourceStepId && baselineTime.get(action.sourceStepId) !== action.startTime).length,
  };
}

/**
 * Steps ticked per day that belong to this routine. Check-offs record contextRow ids, which is
 * exactly what the seeded action ids carry, so the two can be matched.
 */
export async function getRoutineCompletion(id: string, days: number): Promise<DayActivity[]> {
  const { routine, actions } = await findRoutine(id);
  const owned = new Set<string>();
  actions.forEach((action) => {
    if (action.sourceStepId) owned.add(action.sourceStepId);
    owned.add(action.id);
  });
  const cutoff = new Date(Date.now() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  const snapshot = await db.collection('users').doc(routine.userId).collection('checkOffs').where('day', '>=', cutoff).get();
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
