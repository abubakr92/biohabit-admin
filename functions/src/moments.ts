import { db } from './firebase';
import { HttpError } from './store';
import type { Moment, MomentInput, MomentKey } from './types';

/**
 * The seven moments of a day, at `moments/{key}`.
 *
 * A fixed list, not a free-form collection: the keys are the ones the app already writes to
 * users/{uid}.baseMoments, so there is no create or delete — only editing each moment's values.
 * The order and the English names come from the Build 8 open items (C1) and are the only values
 * supplied here. Dutch label, daypart and default time are never defaulted: a moment nobody has
 * configured has no document and reads back with those values null, rather than with a guess.
 */
const FIXED: Array<[MomentKey, string]> = [
  ['wake', 'Wake up'],
  ['firstMeal', 'First meal'],
  ['workStart', 'Start of work'],
  ['secondMeal', 'Second meal'],
  ['workEnd', 'End of work'],
  ['lastMeal', 'Last meal'],
  ['bed', 'Bed'],
];
const collection = () => db.collection('moments');
type Stored = MomentInput & { sortOrder: number; updatedAt: string };

function read(key: MomentKey, sortOrder: number, englishName: string, stored?: Partial<Stored>): Moment {
  return {
    key,
    sortOrder,
    label: stored?.label ?? { nl: '', en: englishName },
    daypart: stored?.daypart ?? null,
    defaultTime: stored?.defaultTime ?? null,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export async function listMoments(): Promise<Moment[]> {
  const documents = await db.getAll(...FIXED.map(([key]) => collection().doc(key)));
  return FIXED.map(([key, name], index) => read(key, index, name, documents[index].exists ? (documents[index].data() as Stored) : undefined));
}

export async function updateMoment(key: string, input: MomentInput): Promise<Moment> {
  const index = FIXED.findIndex(([fixed]) => fixed === key);
  if (index < 0) throw new HttpError(404, 'Moment not found.');
  // sortOrder is written alongside so the app can order the list without hard-coding it.
  const stored: Stored = { ...input, sortOrder: index, updatedAt: new Date().toISOString() };
  await collection().doc(key).set(stored);
  return read(FIXED[index][0], index, FIXED[index][1], stored);
}
