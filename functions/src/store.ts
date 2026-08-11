import type { AppUser, ContextRow, ContextRowInput, Label, LabelInput, MicroAction, MicroActionInput, Mode, Stack, StackInput } from './types';
import { db } from './firebase';

const collections = { stacks: 'stacks', contexts: 'contextRows', actions: 'microActions', labels: 'labels', users: 'users' } as const;
const rank: Record<Mode, number> = { essential: 0, balanced: 1, full: 2 };

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

async function hydratedStacks(): Promise<Stack[]> {
  const [storedStacks, rows, actions] = await Promise.all([
    all<StackInput & { createdAt: string; updatedAt: string }>(collections.stacks),
    all<Omit<ContextRow, 'id'>>(collections.contexts),
    all<Omit<MicroAction, 'id' | 'usedInStacksCount'>>(collections.actions),
  ]);
  const typedRows = rows as ContextRow[]; const typedActions = actions.map((action) => ({ ...action, usedInStacksCount: 0 })) as MicroAction[];
  return storedStacks.map((stack) => { const ownRows = typedRows.filter((row) => row.stackId === stack.id); return { ...stack, actionCount: ownRows.length, modeDurations: { essential: durationFor(ownRows, typedActions, 'essential'), balanced: durationFor(ownRows, typedActions, 'balanced'), full: durationFor(ownRows, typedActions, 'full') } }; });
}

export const listStacks = async () => (await hydratedStacks()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export async function getStack(id: string) { const stacks = await hydratedStacks(); const stack = stacks.find((item) => item.id === id); if (!stack) throw new HttpError(404, 'Stack not found.'); return stack; }
export async function createStack(input: StackInput) { const now = new Date().toISOString(); const reference = await db.collection(collections.stacks).add({ ...input, createdAt: now, updatedAt: now }); return getStack(reference.id); }
export async function updateStack(id: string, input: StackInput) { await one<StackInput>(collections.stacks, id, 'Stack'); await db.collection(collections.stacks).doc(id).set({ ...input, updatedAt: new Date().toISOString() }, { merge: true }); return getStack(id); }
export async function duplicateStack(id: string) { const source = await getStack(id); const rows = await listContextRows(id); const now = new Date().toISOString(); const stackRef = db.collection(collections.stacks).doc(); const batch = db.batch(); batch.set(stackRef, { title: { nl: `${source.title.nl} (kopie)`, en: `${source.title.en} (copy)` }, description: source.description, coherence: source.coherence, suggestedTiming: source.suggestedTiming, functionTag: source.functionTag, primaryLabel: source.primaryLabel, supportingLabels: source.supportingLabels, level: source.level, isPremium: source.isPremium, isActive: false, createdAt: now, updatedAt: now }); rows.forEach(({ id: _id, stackId: _stackId, ...row }) => batch.set(db.collection(collections.contexts).doc(), { ...row, stackId: stackRef.id })); await batch.commit(); return getStack(stackRef.id); }

export async function listContextRows(stackId: string) { const rows = await all<Omit<ContextRow, 'id'>>(collections.contexts); return (rows as ContextRow[]).filter((row) => row.stackId === stackId).sort((a, b) => a.stackSortOrder - b.stackSortOrder); }
async function validateRelative(row: ContextRowInput, stackId: string, currentId?: string) { if (row.timingType !== 'relative' || !row.relativeToContextId) return; if (row.relativeToContextId === currentId) throw new HttpError(422, 'A context row cannot depend on itself.'); const target = await one<Omit<ContextRow, 'id'>>(collections.contexts, row.relativeToContextId, 'Relative context row'); if (target.stackId !== stackId || target.stackSortOrder >= row.stackSortOrder) throw new HttpError(422, 'Relative timing may only reference an earlier row in the same stack.'); }
export async function createContextRow(stackId: string, input: ContextRowInput) { await Promise.all([one<StackInput>(collections.stacks, stackId, 'Stack'), one<MicroActionInput>(collections.actions, input.microActionId, 'Micro-action')]); await validateRelative(input, stackId); const reference = await db.collection(collections.contexts).add({ ...input, stackId }); return { ...input, id: reference.id, stackId }; }
export async function getContextRow(id: string) { return one<Omit<ContextRow, 'id'>>(collections.contexts, id, 'Context row') as Promise<ContextRow>; }
export async function updateContextRow(id: string, input: ContextRowInput) { const existing = await getContextRow(id); await validateRelative(input, existing.stackId, id); await db.collection(collections.contexts).doc(id).set(input, { merge: true }); return { ...input, id, stackId: existing.stackId }; }
export async function deleteContextRow(id: string) { await getContextRow(id); const dependents = (await all<Omit<ContextRow, 'id'>>(collections.contexts)).filter((row) => row.relativeToContextId === id); if (dependents.length) throw new HttpError(409, `This row is referenced by: ${dependents.map((row) => row.microActionTitle.en).join(', ')}.`); await db.collection(collections.contexts).doc(id).delete(); }
export async function reorderContextRows(stackId: string, ids: string[]) { const rows = await listContextRows(stackId); const current = new Set(rows.map((row) => row.id)); if (ids.length !== rows.length || ids.some((id) => !current.has(id))) throw new HttpError(422, 'Reorder IDs must include every row in this stack exactly once.'); const batch = db.batch(); ids.forEach((id, index) => batch.update(db.collection(collections.contexts).doc(id), { stackSortOrder: index })); await batch.commit(); }

export async function listMicroActions(): Promise<MicroAction[]> { const [actions, rows] = await Promise.all([all<MicroActionInput>(collections.actions), all<Omit<ContextRow, 'id'>>(collections.contexts)]); return actions.map((action) => ({ ...action, usedInStacksCount: new Set(rows.filter((row) => row.microActionId === action.id).map((row) => row.stackId)).size })); }
export async function getMicroAction(id: string) { const action = (await listMicroActions()).find((item) => item.id === id); if (!action) throw new HttpError(404, 'Micro-action not found.'); return action; }
export async function createMicroAction(input: MicroActionInput) { const reference = await db.collection(collections.actions).add(input); return { ...input, id: reference.id, usedInStacksCount: 0 }; }
export async function updateMicroAction(id: string, input: MicroActionInput) { await one<MicroActionInput>(collections.actions, id, 'Micro-action'); await db.collection(collections.actions).doc(id).set(input); return getMicroAction(id); }
export async function deleteMicroAction(id: string) { const action = await getMicroAction(id); const rows = (await all<Omit<ContextRow, 'id'>>(collections.contexts)).filter((row) => row.microActionId === id); if (rows.length) { const stacks = await hydratedStacks(); const names = [...new Set(rows.map((row) => stacks.find((stack) => stack.id === row.stackId)?.title.en).filter((name): name is string => Boolean(name)))]; throw new HttpError(409, `“${action.title.en}” is used in: ${names.join(', ')}.`); } await db.collection(collections.actions).doc(id).delete(); }

export async function listLabels(): Promise<Label[]> { const [labels, stacks, actions] = await Promise.all([all<LabelInput>(collections.labels), hydratedStacks(), all<MicroActionInput>(collections.actions)]); return labels.map((label) => ({ ...label, usageCount: stacks.reduce((count, stack) => count + Number(stack.primaryLabel === label.key) + Number(stack.supportingLabels.includes(label.key)), 0) + actions.reduce((count, action) => count + Number(action.labels.includes(label.key)), 0) })); }
export async function createLabel(input: LabelInput) { const duplicate = (await all<LabelInput>(collections.labels)).find((label) => label.key === input.key); if (duplicate) throw new HttpError(409, `Label key “${input.key}” already exists.`); const reference = await db.collection(collections.labels).add(input); return { ...input, id: reference.id, usageCount: 0 }; }
export async function updateLabel(id: string, input: LabelInput) { await one<LabelInput>(collections.labels, id, 'Label'); const duplicate = (await all<LabelInput>(collections.labels)).find((label) => label.key === input.key && label.id !== id); if (duplicate) throw new HttpError(409, `Label key “${input.key}” already exists.`); await db.collection(collections.labels).doc(id).set(input); return (await listLabels()).find((label) => label.id === id)!; }
export async function deleteLabel(id: string) { const label = (await listLabels()).find((item) => item.id === id); if (!label) throw new HttpError(404, 'Label not found.'); if (label.usageCount) { const [stacks, actions] = await Promise.all([hydratedStacks(), listMicroActions()]); const dependents = [...stacks.filter((stack) => stack.primaryLabel === label.key || stack.supportingLabels.includes(label.key)).map((stack) => `stack: ${stack.title.en}`), ...actions.filter((action) => action.labels.includes(label.key)).map((action) => `action: ${action.title.en}`)]; throw new HttpError(409, `“${label.name.en}” is used by ${dependents.join(', ')}.`); } await db.collection(collections.labels).doc(id).delete(); }

export async function listUsers(): Promise<AppUser[]> { return all<Omit<AppUser, 'id'>>(collections.users) as Promise<AppUser[]>; }
export async function getUser(id: string) { return one<Omit<AppUser, 'id'>>(collections.users, id, 'User') as Promise<AppUser>; }
export async function unlockUser(id: string) { await getUser(id); await db.collection(collections.users).doc(id).update({ unlockedAt: new Date().toISOString() }); return getUser(id); }
export async function ensureAdminUser(uid: string, email: string) { const reference = db.collection(collections.users).doc(uid); const snapshot = await reference.get(); if (!snapshot.exists) throw new HttpError(403, 'No BIOHABIT user profile exists for this account.'); const user = snapshot.data() as Omit<AppUser, 'id'>; if (user.accessLevel !== 'admin') throw new HttpError(403, 'This account is not authorised for admin access.'); return { ...user, id: uid, email: user.email || email }; }
