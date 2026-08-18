import type { Query } from 'firebase-admin/firestore';
import type { AccessLevel, AppUser, CheckOffDay, CheckOffStep, ContextRow, ContextRowInput, DayActivity, Label, LabelInput, MicroAction, MicroActionInput, Mode, Stack, StackInput, UserActivity, UserPreferences } from './types';
import { db } from './firebase';

const collections = { stacks: 'stacks', contexts: 'contextRows', actions: 'microActions', labels: 'labels', users: 'users', audit: 'auditLogs', checkOffs: 'checkOffs' } as const;
const rank: Record<Mode, number> = { essential: 0, balanced: 1, full: 2 };
const SILENT_AFTER_MS = 259_200_000;

export class HttpError extends Error {
  constructor(public status: number, message: string, public fieldErrors?: Record<string, string[]>) { super(message); }
}

async function all<T>(collection: string): Promise<Array<T & { id: string }>> {
  const snapshot = await db.collection(collection).get();
  return snapshot.docs.map((document) => ({ ...(document.data() as T), id: document.id }));
}

async function one<T>(collection: string, id: string, label: string): Promise<T & { id: string }> {
  const snapshot = await db.collection(collection).doc(id).get();
  if (!snapshot.exists) throw new HttpError(404, `${label} not found.`);
  return { ...(snapshot.data() as T), id: snapshot.id };
}

function durationFor(rows: ContextRow[], actions: MicroAction[], mode: Mode) {
  return rows.filter((row) => rank[row.includedInMode] <= rank[mode]).reduce((sum, row) => sum + (row.durationOverrideMin ?? actions.find((action) => action.id === row.microActionId)?.durationMin ?? 0), 0);
}

function hydrate<T extends StackInput & { id: string; createdAt: string; updatedAt: string }>(stack: T, rows: ContextRow[], actions: MicroAction[]): Stack {
  return { ...stack, actionCount: rows.length, modeDurations: { essential: durationFor(rows, actions, 'essential'), balanced: durationFor(rows, actions, 'balanced'), full: durationFor(rows, actions, 'full') } };
}

// Fetches only the micro-actions a set of rows actually references, rather than the whole collection.
async function actionsByIds(ids: string[]): Promise<MicroAction[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const documents = await db.getAll(...unique.map((id) => db.collection(collections.actions).doc(id)));
  return documents.filter((document) => document.exists).map((document) => ({ ...(document.data() as MicroActionInput), id: document.id, usedInStacksCount: 0 }));
}

async function hydratedStacks(): Promise<Stack[]> {
  const [storedStacks, rows, actions] = await Promise.all([
    all<StackInput & { createdAt: string; updatedAt: string }>(collections.stacks),
    all<Omit<ContextRow, 'id'>>(collections.contexts),
    all<Omit<MicroAction, 'id' | 'usedInStacksCount'>>(collections.actions),
  ]);
  const typedRows = rows as ContextRow[]; const typedActions = actions.map((action) => ({ ...action, usedInStacksCount: 0 })) as MicroAction[];
  return storedStacks.map((stack) => hydrate(stack, typedRows.filter((row) => row.stackId === stack.id), typedActions));
}

export const listStacks = async () => (await hydratedStacks()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export async function getStack(id: string) { const stack = await one<StackInput & { createdAt: string; updatedAt: string }>(collections.stacks, id, 'Stack'); const rows = await listContextRows(id); return hydrate(stack, rows, await actionsByIds(rows.map((row) => row.microActionId))); }
export async function createStack(input: StackInput) { const now = new Date().toISOString(); const reference = await db.collection(collections.stacks).add({ ...input, createdAt: now, updatedAt: now }); return getStack(reference.id); }
export async function updateStack(id: string, input: StackInput) { await one<StackInput>(collections.stacks, id, 'Stack'); await db.collection(collections.stacks).doc(id).set({ ...input, updatedAt: new Date().toISOString() }, { merge: true }); return getStack(id); }
export async function deleteStack(id: string) { const stack = await one<StackInput>(collections.stacks, id, 'Stack'); const rows = await listContextRows(id); const batch = db.batch(); rows.forEach((row) => batch.delete(db.collection(collections.contexts).doc(row.id))); batch.delete(db.collection(collections.stacks).doc(id)); await batch.commit(); return stack; }
export async function duplicateStack(id: string) { const source = await getStack(id); const rows = await listContextRows(id); const now = new Date().toISOString(); const stackRef = db.collection(collections.stacks).doc(); const batch = db.batch(); batch.set(stackRef, { title: { nl: `${source.title.nl} (kopie)`, en: `${source.title.en} (copy)` }, description: source.description, coherence: source.coherence, suggestedTiming: source.suggestedTiming, functionTag: source.functionTag, primaryLabel: source.primaryLabel, supportingLabels: source.supportingLabels, level: source.level, daypart: source.daypart ?? null, isPremium: source.isPremium, isActive: false, createdAt: now, updatedAt: now }); const copiedIds = new Map<string, string>(); rows.forEach((row) => copiedIds.set(row.id, db.collection(collections.contexts).doc().id)); rows.forEach(({ id: rowId, stackId: _stackId, ...row }) => batch.set(db.collection(collections.contexts).doc(copiedIds.get(rowId)!), { ...row, relativeToContextId: row.relativeToContextId ? (copiedIds.get(row.relativeToContextId) ?? null) : null, stackId: stackRef.id })); await batch.commit(); return getStack(stackRef.id); }

export async function listContextRows(stackId: string) { const snapshot = await db.collection(collections.contexts).where('stackId', '==', stackId).orderBy('stackSortOrder', 'asc').get(); return snapshot.docs.map((document) => ({ ...(document.data() as Omit<ContextRow, 'id'>), id: document.id })) as ContextRow[]; }
async function validateRelative(row: ContextRowInput, stackId: string, currentId?: string) { if (row.timingType !== 'relative' || !row.relativeToContextId) return; if (row.relativeToContextId === currentId) throw new HttpError(422, 'A context row cannot depend on itself.'); const target = await one<Omit<ContextRow, 'id'>>(collections.contexts, row.relativeToContextId, 'Relative context row'); if (target.stackId !== stackId || target.stackSortOrder >= row.stackSortOrder) throw new HttpError(422, 'Relative timing may only reference an earlier row in the same stack.'); }
export async function createContextRow(stackId: string, input: ContextRowInput) { await Promise.all([one<StackInput>(collections.stacks, stackId, 'Stack'), one<MicroActionInput>(collections.actions, input.microActionId, 'Micro-action')]); await validateRelative(input, stackId); const reference = await db.collection(collections.contexts).add({ ...input, stackId }); return { ...input, id: reference.id, stackId }; }
export async function getContextRow(id: string) { return one<Omit<ContextRow, 'id'>>(collections.contexts, id, 'Context row') as Promise<ContextRow>; }
export async function updateContextRow(id: string, input: ContextRowInput) { const existing = await getContextRow(id); await validateRelative(input, existing.stackId, id); await db.collection(collections.contexts).doc(id).set(input, { merge: true }); return { ...input, id, stackId: existing.stackId }; }
export async function deleteContextRow(id: string) { await getContextRow(id); const dependents = (await db.collection(collections.contexts).where('relativeToContextId', '==', id).get()).docs.map((document) => document.data() as Omit<ContextRow, 'id'>); if (dependents.length) throw new HttpError(409, `This row is referenced by: ${dependents.map((row) => row.microActionTitle.en).join(', ')}.`); await db.collection(collections.contexts).doc(id).delete(); }
export async function reorderContextRows(stackId: string, ids: string[]) {
  const rows = await listContextRows(stackId); const current = new Set(rows.map((row) => row.id));
  if (ids.length !== rows.length || new Set(ids).size !== ids.length || ids.some((id) => !current.has(id))) throw new HttpError(422, 'Reorder IDs must include every row in this stack exactly once.');
  const position = new Map(ids.map((id, index) => [id, index] as const));
  // A reorder must not move a relative row above the row it depends on — the same invariant create and update enforce.
  const inverted = rows.filter((row) => row.timingType === 'relative' && row.relativeToContextId && (position.get(row.relativeToContextId) ?? -1) >= (position.get(row.id) ?? 0));
  if (inverted.length) throw new HttpError(422, `This order moves ${inverted.map((row) => `“${row.microActionTitle.en}”`).join(', ')} before the row it depends on.`);
  const batch = db.batch(); ids.forEach((id, index) => batch.update(db.collection(collections.contexts).doc(id), { stackSortOrder: index })); await batch.commit();
}

export async function listMicroActions(): Promise<MicroAction[]> { const [actions, rows] = await Promise.all([all<MicroActionInput>(collections.actions), all<Omit<ContextRow, 'id'>>(collections.contexts)]); return actions.map((action) => ({ ...action, usedInStacksCount: new Set(rows.filter((row) => row.microActionId === action.id).map((row) => row.stackId)).size })); }
export async function getMicroAction(id: string) { const action = await one<MicroActionInput>(collections.actions, id, 'Micro-action'); const rows = (await db.collection(collections.contexts).where('microActionId', '==', id).get()).docs.map((document) => document.data() as Omit<ContextRow, 'id'>); return { ...action, usedInStacksCount: new Set(rows.map((row) => row.stackId)).size }; }
export async function createMicroAction(input: MicroActionInput) { const reference = await db.collection(collections.actions).add(input); return { ...input, id: reference.id, usedInStacksCount: 0 }; }
export async function updateMicroAction(id: string, input: MicroActionInput) { await one<MicroActionInput>(collections.actions, id, 'Micro-action'); await db.collection(collections.actions).doc(id).set(input); return getMicroAction(id); }
export async function deleteMicroAction(id: string) { const action = await one<MicroActionInput>(collections.actions, id, 'Micro-action'); const rows = (await db.collection(collections.contexts).where('microActionId', '==', id).get()).docs.map((document) => document.data() as Omit<ContextRow, 'id'>); if (rows.length) { const stacks = await db.getAll(...[...new Set(rows.map((row) => row.stackId))].map((stackId) => db.collection(collections.stacks).doc(stackId))); const names = stacks.filter((document) => document.exists).map((document) => (document.data() as StackInput).title.en); throw new HttpError(409, `“${action.title.en}” is used in: ${names.join(', ')}.`); } await db.collection(collections.actions).doc(id).delete(); }

async function labelUsage(key: string) { const [stacks, actions] = await Promise.all([all<StackInput>(collections.stacks), all<MicroActionInput>(collections.actions)]); return [...stacks.filter((stack) => stack.primaryLabel === key || stack.supportingLabels.includes(key)).map((stack) => `stack: ${stack.title.en}`), ...actions.filter((action) => action.labels.includes(key)).map((action) => `action: ${action.title.en}`)]; }
export async function listLabels(): Promise<Label[]> { const [labels, stacks, actions] = await Promise.all([all<LabelInput>(collections.labels), all<StackInput>(collections.stacks), all<MicroActionInput>(collections.actions)]); return labels.map((label) => ({ ...label, usageCount: stacks.reduce((count, stack) => count + Number(stack.primaryLabel === label.key) + Number(stack.supportingLabels.includes(label.key)), 0) + actions.reduce((count, action) => count + Number(action.labels.includes(label.key)), 0) })); }
export async function createLabel(input: LabelInput) { const duplicate = (await all<LabelInput>(collections.labels)).find((label) => label.key === input.key); if (duplicate) throw new HttpError(409, `Label key “${input.key}” already exists.`); const reference = await db.collection(collections.labels).add(input); return { ...input, id: reference.id, usageCount: 0 }; }
export async function updateLabel(id: string, input: LabelInput) {
  const existing = await one<LabelInput>(collections.labels, id, 'Label');
  const duplicate = (await all<LabelInput>(collections.labels)).find((label) => label.key === input.key && label.id !== id);
  if (duplicate) throw new HttpError(409, `Label key “${input.key}” already exists.`);
  // Stacks and micro-actions reference labels by key, so renaming a key in use would orphan every reference.
  if (existing.key !== input.key) { const usage = await labelUsage(existing.key); if (usage.length) throw new HttpError(409, `The key “${existing.key}” is still used by ${usage.join(', ')}. Remove those references before renaming the key.`); }
  await db.collection(collections.labels).doc(id).set(input);
  return (await listLabels()).find((label) => label.id === id)!;
}
export async function deleteLabel(id: string) { const label = await one<LabelInput>(collections.labels, id, 'Label'); const usage = await labelUsage(label.key); if (usage.length) throw new HttpError(409, `“${label.name.en}” is used by ${usage.join(', ')}.`); await db.collection(collections.labels).doc(id).delete(); }

async function usersPage(query: Query, limit: number, cursorId?: string) {
  let scoped = query;
  if (cursorId) { const start = await db.collection(collections.users).doc(cursorId).get(); if (!start.exists) throw new HttpError(400, 'The pagination cursor is no longer valid.'); scoped = scoped.startAfter(start); }
  const snapshot = await scoped.limit(limit + 1).get();
  const documents = snapshot.docs.slice(0, limit);
  return { users: documents.map((document) => ({ ...(document.data() as Omit<AppUser, 'id'>), id: document.id })), more: snapshot.docs.length > limit, lastId: documents.length ? documents[documents.length - 1].id : null };
}

export async function listUsers(status: 'all' | 'silent' | 'unlocked' | 'locked', limit: number, cursor?: string) {
  const collection = db.collection(collections.users);
  if (status === 'silent') return listSilentUsers(limit, cursor);
  const query = status === 'unlocked' ? collection.where('unlockedAt', '>', '').orderBy('unlockedAt', 'desc')
    : status === 'locked' ? collection.where('unlockedAt', '==', null).orderBy('createdAt', 'desc')
      : collection.orderBy('createdAt', 'desc');
  const page = await usersPage(query, limit, cursor);
  return { users: page.users, nextCursor: page.more ? page.lastId : null };
}

// "Silent" spans two disjoint sets, because a Firestore inequality filter skips null values
// outright: testers who have never checked off can only be reached by an equality query, and are
// invisible to the `<=` range that finds the merely stale ones. The cursor records which of the
// two passes it belongs to, and a short first pass is topped up from the second.
async function listSilentUsers(limit: number, cursor?: string) {
  const collection = db.collection(collections.users);
  const separator = cursor ? cursor.indexOf(':') : -1;
  const phase = cursor ? cursor.slice(0, separator) : 'never';
  const cursorId = separator >= 0 ? cursor!.slice(separator + 1) || undefined : undefined;
  if (phase !== 'never' && phase !== 'stale') throw new HttpError(400, 'The pagination cursor is no longer valid.');
  const stale = () => collection.where('lastCheckOffAt', '<=', new Date(Date.now() - SILENT_AFTER_MS).toISOString()).orderBy('lastCheckOffAt', 'asc');

  if (phase === 'stale') { const page = await usersPage(stale(), limit, cursorId); return { users: page.users, nextCursor: page.more ? `stale:${page.lastId}` : null }; }

  const never = await usersPage(collection.where('lastCheckOffAt', '==', null).orderBy('createdAt', 'desc'), limit, cursorId);
  if (never.more) return { users: never.users, nextCursor: `never:${never.lastId}` };
  const remaining = limit - never.users.length;
  if (remaining <= 0) return { users: never.users, nextCursor: 'stale:' };
  const page = await usersPage(stale(), remaining);
  return { users: [...never.users, ...page.users], nextCursor: page.more ? `stale:${page.lastId}` : null };
}
export async function getUser(id: string) { return one<Omit<AppUser, 'id'>>(collections.users, id, 'User') as Promise<AppUser>; }
export async function unlockUser(id: string) { await getUser(id); await db.collection(collections.users).doc(id).update({ unlockedAt: new Date().toISOString() }); return getUser(id); }
export async function ensureAdminUser(uid: string, email: string, hasAdminClaim: boolean) {
  const snapshot = await db.collection(collections.users).doc(uid).get();
  const profile = snapshot.exists ? (snapshot.data() as Omit<AppUser, 'id'>) : null;
  if (!hasAdminClaim && !profile) throw new HttpError(403, 'No BIOHABIT user profile exists for this account.');
  if (!hasAdminClaim && profile!.accessLevel !== 'admin') throw new HttpError(403, 'This account is not authorised for admin access.');
  return { id: uid, email: profile?.email || email, accessLevel: 'admin' as AccessLevel };
}

export async function recordAudit(actor: { id: string; email: string }, action: string, resource: string, resourceId: string) {
  await db.collection(collections.audit).add({ actorId: actor.id, actorEmail: actor.email, action, resource, resourceId, at: new Date().toISOString() }).catch((error: unknown) => { console.error('Audit write failed', error); });
}

// --- Member activity -------------------------------------------------------

/** Firestore hands back Timestamps for app-written fields and strings for panel-written ones. */
function isoOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const stamp = value as { toDate?: () => Date; _seconds?: number };
  if (typeof stamp.toDate === 'function') return stamp.toDate().toISOString();
  if (typeof stamp._seconds === 'number') return new Date(stamp._seconds * 1000).toISOString();
  return null;
}

export async function getUserPreferences(id: string): Promise<UserPreferences> {
  const snapshot = await db.collection(collections.users).doc(id).get();
  if (!snapshot.exists) throw new HttpError(404, 'User not found.');
  const data = snapshot.data() as Record<string, unknown>;
  const preferences = (data.preferences ?? {}) as Record<string, string | undefined>;
  return { need: preferences.need ?? null, timing: preferences.timing ?? null, focus: preferences.focus ?? null, budget: preferences.budget ?? null, selected: data.preferencesSelected === true, setAt: isoOf(data.preferencesSetAt) };
}

/** Resolves ticked contextRow ids into titles and their parent stacks, batched rather than per row. */
async function hydrateDays(documents: FirebaseFirestore.QueryDocumentSnapshot[]): Promise<CheckOffDay[]> {
  const stepIds = [...new Set(documents.flatMap((document) => (document.get('stepIds') as string[]) ?? []))];
  const rows = stepIds.length ? await db.getAll(...stepIds.map((stepId) => db.collection(collections.contexts).doc(stepId))) : [];
  const rowById = new Map(rows.filter((row) => row.exists).map((row) => [row.id, row.data() as Omit<ContextRow, 'id'>]));
  const stackIds = [...new Set([...rowById.values()].map((row) => row.stackId))];
  const stacks = stackIds.length ? await db.getAll(...stackIds.map((stackId) => db.collection(collections.stacks).doc(stackId))) : [];
  const stackTitle = new Map(stacks.filter((stack) => stack.exists).map((stack) => [stack.id, (stack.data() as StackInput).title.en]));
  // Total steps per stack, so a day reads "3 of 4" rather than a bare count.
  const totals = new Map<string, number>();
  await Promise.all(stackIds.map(async (stackId) => { totals.set(stackId, (await db.collection(collections.contexts).where('stackId', '==', stackId).count().get()).data().count); }));

  return documents.map((document) => {
    const ids = ((document.get('stepIds') as string[]) ?? []).filter((stepId) => rowById.has(stepId));
    const steps: CheckOffStep[] = ids.map((stepId) => {
      const row = rowById.get(stepId)!;
      return { stepId, microActionId: row.microActionId, microActionTitle: row.microActionTitle, stackId: row.stackId, stackTitle: stackTitle.get(row.stackId) ?? row.stackId };
    });
    const grouped = new Map<string, number>();
    steps.forEach((step) => grouped.set(step.stackId, (grouped.get(step.stackId) ?? 0) + 1));
    return {
      day: (document.get('day') as string) ?? document.id,
      updatedAt: isoOf(document.get('updatedAt')),
      stepCount: steps.length,
      steps,
      stacks: [...grouped.entries()].map(([stackId, completed]) => ({ stackId, stackTitle: stackTitle.get(stackId) ?? stackId, completed, total: totals.get(stackId) ?? completed })).sort((a, b) => b.completed - a.completed),
    };
  });
}

export async function listUserCheckOffs(id: string, limit: number, cursor?: string) {
  await getUser(id);
  const collection = db.collection(collections.users).doc(id).collection(collections.checkOffs);
  let query = collection.orderBy('day', 'desc');
  if (cursor) { const start = await collection.doc(cursor).get(); if (!start.exists) throw new HttpError(400, 'The pagination cursor is no longer valid.'); query = query.startAfter(start); }
  const snapshot = await query.limit(limit + 1).get();
  const documents = snapshot.docs.slice(0, limit);
  return { days: await hydrateDays(documents), nextCursor: snapshot.docs.length > limit ? documents[documents.length - 1].id : null };
}

/**
 * Steps completed per day. Deliberately a count, not a percentage: which stacks a member is meant
 * to follow is decided in the app from their preferences, so this side has no honest denominator.
 */
export async function getUserActivity(id: string, days: number): Promise<UserActivity> {
  await getUser(id);
  const cutoff = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const snapshot = await db.collection(collections.users).doc(id).collection(collections.checkOffs).where('day', '>=', cutoff).get();
  const counts = new Map<string, number>();
  snapshot.docs.forEach((document) => counts.set((document.get('day') as string) ?? document.id, ((document.get('stepIds') as string[]) ?? []).length));
  const series: DayActivity[] = Array.from({ length: days }, (_, offset) => {
    const date = new Date(Date.now() - (days - 1 - offset) * 86_400_000).toISOString().slice(0, 10);
    return { date, stepsCompleted: counts.get(date) ?? 0 };
  });
  let streak = 0;
  for (let index = series.length - 1; index >= 0; index -= 1) { if (series[index].stepsCompleted === 0) break; streak += 1; }
  return { days: series, currentStreak: streak, activeDays: series.filter((day) => day.stepsCompleted > 0).length, totalSteps: series.reduce((sum, day) => sum + day.stepsCompleted, 0) };
}
