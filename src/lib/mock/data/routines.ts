import type {
  DayActivity,
  RoutineDivergence,
  UserRoutine,
  UserRoutineAction,
  Weekday,
} from '@/types/models';
import { seedContextRows } from './context-rows';
import { seedStacks } from './stacks';
import { seedUsers } from './users';

/**
 * Mirrors what the app actually stores: `users/{uid}/routines/{routineId}`, with the actions held
 * as an array inside the routine document. Two conventions carry meaning and are reproduced here:
 * an action id prefixed `seed-` came from a stack template and the remainder is the contextRows id
 * it was copied from; anything else the member added themselves.
 */
const SEED_PREFIX = 'seed-';
const DAY_MS = 86_400_000;
const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function seeded(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

interface Seed {
  user: number;
  title: string;
  stack: number | null;
  mode: string;
  weekdays: Weekday[];
  startsAt: string | null;
  status: 'active' | 'inactive' | 'expired';
  /** How many of the template's steps the member kept, and how many they added themselves. */
  keep: number;
  added: number;
  shiftFirstTime: boolean;
}

const seeds: Seed[] = [
  {
    user: 0,
    title: 'Calm morning',
    stack: 0,
    mode: 'essential',
    weekdays: WEEKDAYS,
    startsAt: '07:30',
    status: 'active',
    keep: 3,
    added: 1,
    shiftFirstTime: true,
  },
  {
    user: 0,
    title: 'Evening landing',
    stack: 3,
    mode: 'balanced',
    weekdays: ['mon', 'wed', 'fri'],
    startsAt: '21:30',
    status: 'active',
    keep: 4,
    added: 0,
    shiftFirstTime: false,
  },
  {
    user: 0,
    title: 'Weekend reset',
    stack: null,
    mode: 'full',
    weekdays: ['sat', 'sun'],
    startsAt: '09:30',
    status: 'inactive',
    keep: 0,
    added: 3,
    shiftFirstTime: false,
  },
  {
    user: 1,
    title: 'Focus block',
    stack: 2,
    mode: 'balanced',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startsAt: '09:00',
    status: 'active',
    keep: 2,
    added: 2,
    shiftFirstTime: false,
  },
  {
    user: 2,
    title: 'Gut rhythm',
    stack: 4,
    mode: 'essential',
    weekdays: WEEKDAYS,
    startsAt: '08:00',
    status: 'active',
    keep: 4,
    added: 0,
    shiftFirstTime: true,
  },
  {
    user: 4,
    title: 'My own wind-down',
    stack: null,
    mode: 'balanced',
    weekdays: ['sun'],
    startsAt: '22:00',
    status: 'active',
    keep: 0,
    added: 4,
    shiftFirstTime: false,
  },
  {
    user: 7,
    title: 'Deep recovery',
    stack: 7,
    mode: 'full',
    weekdays: ['tue', 'thu'],
    startsAt: '22:00',
    status: 'expired',
    keep: 3,
    added: 0,
    shiftFirstTime: false,
  },
  {
    user: 10,
    title: 'Hydration habit',
    stack: null,
    mode: 'essential',
    weekdays: WEEKDAYS,
    startsAt: null,
    status: 'active',
    keep: 0,
    added: 2,
    shiftFirstTime: false,
  },
];

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

function buildActions(routineId: string, seed: Seed): UserRoutineAction[] {
  const actions: UserRoutineAction[] = [];
  const rows =
    seed.stack === null
      ? []
      : seedContextRows
          .filter((row) => row.stackId === seedStacks[seed.stack!].id)
          .slice(0, seed.keep);

  rows.forEach((row, index) => {
    const shifted = seed.shiftFirstTime && index === 0;
    actions.push({
      id: `${SEED_PREFIX}${row.id}`,
      routineId,
      microActionId: row.microActionId,
      title: row.microActionTitle.en,
      microActionTitle: row.microActionTitle,
      sortOrder: actions.length,
      startTime: shifted ? '06:45' : (row.startTime ?? '07:30'),
      durationLabel: `${row.durationOverrideMin ?? 3} min`,
      durationMin: row.durationOverrideMin ?? 3,
      depth: 'light',
      isActive: seeded(`${routineId}-on${index}`) <= 0.85,
      isUserAdded: false,
      sourceStepId: row.id,
    });
  });

  for (let index = 0; index < seed.added; index += 1) {
    const fromLibrary = seeded(`${routineId}-lib${index}`) > 0.4;
    const title = fromLibrary ? `Extra step ${index + 1}` : `My own step ${index + 1}`;
    actions.push({
      id: `action-${1787000000000 + index}`,
      routineId,
      microActionId: fromLibrary ? `action-${(index % 25) + 1}` : null,
      title,
      microActionTitle: { nl: title, en: title },
      sortOrder: actions.length,
      startTime: `${String(8 + index).padStart(2, '0')}:15`,
      durationLabel: `${2 + index} min`,
      durationMin: 2 + index,
      depth: 'light',
      isActive: true,
      isUserAdded: true,
      sourceStepId: null,
    });
  }
  return actions;
}

const built = seeds.map((seed, index) => buildActions(`routine-${index + 1}`, seed));

export const seedRoutineActions: UserRoutineAction[] = built.flat();

export const seedRoutines: UserRoutine[] = seeds.map((seed, index) => {
  const user = seedUsers[seed.user];
  const stack = seed.stack === null ? null : seedStacks[seed.stack];
  const createdDaysAgo = 12 + index * 5;
  return {
    id: `routine-${index + 1}`,
    userId: user.id,
    userEmail: user.email,
    title: seed.title,
    description: stack
      ? `A practical routine for ${stack.title.en.toLowerCase()}.`
      : 'Built from scratch in the app.',
    source: stack ? 'template' : 'custom',
    sourceStackId: stack?.id ?? null,
    sourceStackTitle: stack?.title.en ?? null,
    mode: seed.mode,
    weekdays: seed.weekdays,
    repeat: seed.weekdays.length === 7 ? 'daily' : 'weekdays',
    anchorLabel: 'After waking up',
    startsAt: seed.startsAt,
    durationMinutes: built[index].reduce((sum, action) => sum + (action.durationMin ?? 0), 0),
    notificationOn: index % 2 === 0,
    enabled: seed.status !== 'inactive',
    status: seed.status,
    actionCount: built[index].length,
    createdAt: iso(createdDaysAgo),
    updatedAt: iso(index),
  };
});

/** Diffed against the source stack, exactly as the API does it. */
export function divergenceFor(routineId: string): RoutineDivergence | null {
  const index = seedRoutines.findIndex((routine) => routine.id === routineId);
  const routine = seedRoutines[index];
  if (!routine?.sourceStackId) return null;
  const baselineRows = seedContextRows.filter((row) => row.stackId === routine.sourceStackId);
  const baseline = baselineRows.map((row) => row.id);
  const actions = built[index];
  const current = actions
    .map((action) => action.sourceStepId)
    .filter((stepId): stepId is string => Boolean(stepId));
  const inherited = current.filter((stepId) => baseline.includes(stepId));
  const baselineOrder = baseline.filter((stepId) => current.includes(stepId));
  const baselineTime = new Map(baselineRows.map((row) => [row.id, row.startTime]));
  const stack = seedStacks.find((item) => item.id === routine.sourceStackId);
  return {
    nameChanged: Boolean(stack && routine.title !== stack.title.en),
    actionsAdded: actions.filter((action) => action.isUserAdded).length,
    actionsRemoved: baseline.filter((stepId) => !current.includes(stepId)).length,
    orderChanged: inherited.some((stepId, position) => baselineOrder[position] !== stepId),
    timesChanged: actions.filter(
      (action) => action.sourceStepId && baselineTime.get(action.sourceStepId) !== action.startTime,
    ).length,
  };
}

/** Steps ticked per day for one routine, oldest first — a count, matching the real endpoint. */
export function routineCompletion(routineId: string, days: number): DayActivity[] {
  const routine = seedRoutines.find((item) => item.id === routineId);
  const actionCount = routine?.actionCount ?? 0;
  return Array.from({ length: days }, (_, offset) => {
    const daysAgo = days - 1 - offset;
    const date = new Date(Date.now() - daysAgo * DAY_MS).toISOString().slice(0, 10);
    const roll = seeded(`${routineId}-${date}`);
    const active = routine?.status === 'active' && roll > 0.3;
    return { date, stepsCompleted: active ? Math.max(1, Math.round(actionCount * roll)) : 0 };
  });
}
