import type {
  Mode,
  RoutineDivergence,
  RoutineSource,
  RoutineStatus,
  UserRoutine,
  UserRoutineAction,
  Weekday,
} from '@/types/models';
import { seedMicroActions } from './micro-actions';
import { seedStacks } from './stacks';
import { seedUsers } from './users';

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Stable pseudo-random in [0,1) so the mock looks varied but never shifts between reloads.
 * FNV-1a alone leaves neighbouring keys correlated — `routine-4-on0`..`on5` all landed on the same
 * side of the threshold, switching off every action in one routine — so it is finished with a
 * murmur3 avalanche to decorrelate them.
 */
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

/**
 * The action list a template hands a member the moment they adopt it. Deterministic, so divergence
 * can be computed by diffing a routine against it rather than being asserted by hand.
 */
function templateActionIds(stackIndex: number): string[] {
  return Array.from(
    { length: 4 },
    (_, row) => `action-${((stackIndex * 3 + row) % seedMicroActions.length) + 1}`,
  );
}

type Divergence = 'none' | 'times' | 'added' | 'removed' | 'reordered' | 'heavy';
type Pattern = 'all' | 'weekdays' | 'weekends' | 'thrice';

interface RoutineSeed {
  user: number;
  title: string;
  source: RoutineSource;
  stack: number | null;
  mode: Mode;
  pattern: Pattern;
  anchor: string | null;
  status: RoutineStatus;
  notify: boolean;
  divergence: Divergence;
}

// Twenty routines spread unevenly: users 4, 7, 10 and 13 own none; users 1, 8 and 14 own three.
// Twelve start from a template and eight are built from scratch.
const seeds: RoutineSeed[] = [
  {
    user: 0,
    title: 'My calm morning',
    source: 'template',
    stack: 0,
    mode: 'essential',
    pattern: 'weekdays',
    anchor: '07:00',
    status: 'active',
    notify: true,
    divergence: 'heavy',
  },
  {
    user: 0,
    title: 'Evening landing',
    source: 'template',
    stack: 3,
    mode: 'balanced',
    pattern: 'all',
    anchor: '21:30',
    status: 'active',
    notify: true,
    divergence: 'none',
  },
  {
    user: 0,
    title: 'Weekend reset',
    source: 'custom',
    stack: null,
    mode: 'full',
    pattern: 'weekends',
    anchor: '09:30',
    status: 'inactive',
    notify: false,
    divergence: 'none',
  },
  {
    user: 1,
    title: 'Focus block',
    source: 'template',
    stack: 2,
    mode: 'balanced',
    pattern: 'weekdays',
    anchor: '09:00',
    status: 'active',
    notify: true,
    divergence: 'added',
  },
  {
    user: 1,
    title: 'Desk breaks',
    source: 'custom',
    stack: null,
    mode: 'essential',
    pattern: 'weekdays',
    anchor: null,
    status: 'active',
    notify: false,
    divergence: 'none',
  },
  {
    user: 2,
    title: 'Gut rhythm',
    source: 'template',
    stack: 4,
    mode: 'essential',
    pattern: 'all',
    anchor: '08:00',
    status: 'active',
    notify: true,
    divergence: 'times',
  },
  {
    user: 4,
    title: 'Deep recovery',
    source: 'template',
    stack: 7,
    mode: 'full',
    pattern: 'thrice',
    anchor: '22:00',
    status: 'active',
    notify: true,
    divergence: 'removed',
  },
  {
    user: 4,
    title: 'Morning light walk',
    source: 'custom',
    stack: null,
    mode: 'essential',
    pattern: 'all',
    anchor: '06:45',
    status: 'active',
    notify: true,
    divergence: 'none',
  },
  {
    user: 5,
    title: 'Build resilience',
    source: 'template',
    stack: 6,
    mode: 'balanced',
    pattern: 'thrice',
    anchor: '18:00',
    status: 'expired',
    notify: false,
    divergence: 'reordered',
  },
  {
    user: 7,
    title: 'Clear energy',
    source: 'template',
    stack: 1,
    mode: 'balanced',
    pattern: 'weekdays',
    anchor: '07:15',
    status: 'active',
    notify: true,
    divergence: 'times',
  },
  {
    user: 7,
    title: 'Late shift recovery',
    source: 'custom',
    stack: null,
    mode: 'full',
    pattern: 'weekends',
    anchor: '23:00',
    status: 'active',
    notify: false,
    divergence: 'none',
  },
  {
    user: 7,
    title: 'Movement reset',
    source: 'template',
    stack: 5,
    mode: 'essential',
    pattern: 'thrice',
    anchor: '12:30',
    status: 'inactive',
    notify: false,
    divergence: 'none',
  },
  {
    user: 8,
    title: 'Sleep runway',
    source: 'custom',
    stack: null,
    mode: 'balanced',
    pattern: 'all',
    anchor: '22:15',
    status: 'active',
    notify: true,
    divergence: 'none',
  },
  {
    user: 10,
    title: 'Calm morning',
    source: 'template',
    stack: 0,
    mode: 'essential',
    pattern: 'all',
    anchor: '06:30',
    status: 'active',
    notify: true,
    divergence: 'none',
  },
  {
    user: 10,
    title: 'Screen curfew',
    source: 'custom',
    stack: null,
    mode: 'essential',
    pattern: 'weekdays',
    anchor: '20:00',
    status: 'active',
    notify: false,
    divergence: 'none',
  },
  {
    user: 11,
    title: 'Focus foundation',
    source: 'template',
    stack: 2,
    mode: 'full',
    pattern: 'weekdays',
    anchor: '08:45',
    status: 'active',
    notify: true,
    divergence: 'heavy',
  },
  {
    user: 13,
    title: 'Evening landing',
    source: 'template',
    stack: 3,
    mode: 'balanced',
    pattern: 'all',
    anchor: '21:00',
    status: 'active',
    notify: true,
    divergence: 'added',
  },
  {
    user: 13,
    title: 'Hydration habit',
    source: 'custom',
    stack: null,
    mode: 'essential',
    pattern: 'all',
    anchor: null,
    status: 'active',
    notify: false,
    divergence: 'none',
  },
  {
    user: 13,
    title: 'Old marathon prep',
    source: 'custom',
    stack: null,
    mode: 'full',
    pattern: 'thrice',
    anchor: '05:30',
    status: 'expired',
    notify: false,
    divergence: 'none',
  },
  {
    user: 14,
    title: 'Gut rhythm',
    source: 'template',
    stack: 4,
    mode: 'balanced',
    pattern: 'weekdays',
    anchor: '08:30',
    status: 'inactive',
    notify: false,
    divergence: 'removed',
  },
];

const patterns: Record<Pattern, Weekday[]> = {
  all: WEEKDAYS,
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  weekends: ['sat', 'sun'],
  thrice: ['mon', 'wed', 'fri'],
};

const DAY_MS = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const RANK: Record<Mode, number> = { essential: 0, balanced: 1, full: 2 };
const MODES: Mode[] = ['essential', 'balanced', 'full'];

/** A member's own action list, produced by applying their edits on top of the template baseline. */
function buildActions(routineId: string, seed: RoutineSeed): UserRoutineAction[] {
  let ids: string[];
  let added: string[] = [];

  if (seed.source === 'template' && seed.stack !== null) {
    ids = [...templateActionIds(seed.stack)];
    if (seed.divergence === 'removed' || seed.divergence === 'heavy') ids.splice(1, 1);
    // Reorder before appending, so the action that moves is one the template supplied. Rotating
    // after an append would only move the member's own addition, which is not a reorder at all.
    if (seed.divergence === 'reordered' || seed.divergence === 'heavy')
      ids = [ids[ids.length - 1], ...ids.slice(0, -1)];
    if (seed.divergence === 'added' || seed.divergence === 'heavy') {
      added = [
        `action-${((seed.stack * 7 + 3) % seedMicroActions.length) + 1}`,
        `action-${((seed.stack * 7 + 11) % seedMicroActions.length) + 1}`,
      ].filter((id, index, all) => !ids.includes(id) && all.indexOf(id) === index);
      ids.push(...added);
    }
  } else {
    const size = 3 + Math.floor(seeded(`${routineId}-size`) * 3);
    ids = Array.from(
      { length: size },
      (_, index) =>
        `action-${(Math.floor(seeded(`${routineId}-a${index}`) * seedMicroActions.length) % seedMicroActions.length) + 1}`,
    ).filter((id, index, all) => all.indexOf(id) === index);
    added = ids;
  }

  const shifted = seed.divergence === 'times' || seed.divergence === 'heavy';
  return ids.map((microActionId, index) => {
    const action =
      seedMicroActions.find((item) => item.id === microActionId) ?? seedMicroActions[0];
    const hour = 6 + ((index * 3) % 14);
    const minute = shifted && index % 2 === 0 ? 45 : index % 2 === 0 ? 0 : 30;
    return {
      id: `${routineId}-ra${index + 1}`,
      routineId,
      microActionId,
      microActionTitle: action.title,
      sortOrder: index,
      startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      durationMin: action.durationMin,
      // Never deeper than the routine's own mode, or the action would never be shown.
      includedInMode: MODES[Math.min(index % 3, RANK[seed.mode])],
      isActive: seeded(`${routineId}-on${index}`) <= 0.82,
      isUserAdded: added.includes(microActionId),
    };
  });
}

const built = seeds.map((seed, index) => buildActions(`routine-${index + 1}`, seed));

export const seedRoutineActions: UserRoutineAction[] = built.flat();

export const seedRoutines: UserRoutine[] = seeds.map((seed, index) => {
  const user = seedUsers[seed.user];
  const stack = seed.stack === null ? null : seedStacks[seed.stack];
  const createdDaysAgo = 20 + ((index * 7) % 90);
  return {
    id: `routine-${index + 1}`,
    userId: user.id,
    userEmail: user.email,
    title: seed.title,
    description:
      seed.source === 'template'
        ? `Adapted from ${stack?.title.en ?? 'a template'}.`
        : 'Built from scratch in the app.',
    source: seed.source,
    sourceStackId: stack?.id ?? null,
    sourceStackTitle: stack?.title.en ?? null,
    mode: seed.mode,
    weekdays: patterns[seed.pattern],
    startDate: iso(createdDaysAgo),
    endDate: seed.status === 'expired' ? iso(3 + (index % 5)) : null,
    anchorTime: seed.anchor,
    notificationOn: seed.notify,
    status: seed.status,
    actionCount: built[index].length,
    createdAt: iso(createdDaysAgo),
    updatedAt: iso((index * 3) % 18),
  };
});

/**
 * Diffed against the template baseline rather than asserted, so the panel never reports a change
 * the member did not make. Returns null for routines built from scratch — nothing to diverge from.
 */
export function divergenceFor(routineId: string): RoutineDivergence | null {
  const index = seedRoutines.findIndex((item) => item.id === routineId);
  const routine = seedRoutines[index];
  if (!routine || routine.source !== 'template' || routine.sourceStackId === null) return null;

  const stackIndex = seedStacks.findIndex((stack) => stack.id === routine.sourceStackId);
  const baseline = templateActionIds(stackIndex);
  const actions = built[index];
  const current = actions.map((action) => action.microActionId);
  const inheritedOrder = current.filter((id) => baseline.includes(id));
  const baselineOrder = baseline.filter((id) => current.includes(id));

  return {
    nameChanged: routine.title !== (seedStacks[stackIndex]?.title.en ?? ''),
    actionsAdded: actions.filter((action) => action.isUserAdded).length,
    actionsRemoved: baseline.filter((id) => !current.includes(id)).length,
    orderChanged: inheritedOrder.some((id, position) => baselineOrder[position] !== id),
    timesChanged: actions.filter((action) => action.startTime?.endsWith(':45')).length,
  };
}
