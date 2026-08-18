import type { CheckOffDay, UserPreferences } from '@/types/models';
import { seedContextRows } from './context-rows';
import { seedStacks } from './stacks';
import { seeded } from './routines';

/**
 * Mirrors the real Firestore shape: `users/{uid}/checkOffs/{YYYY-MM-DD}`, one document per day
 * holding the contextRow ids ticked. Members follow admin-authored stacks directly, so a day is
 * summarised against those stacks rather than against any routine of the member's own.
 */
const DAY_MS = 86_400_000;
const WINDOW = 30;

const stackTitle = (stackId: string) =>
  seedStacks.find((stack) => stack.id === stackId)?.title.en ?? stackId;

const totalsByStack = new Map<string, number>();
for (const row of seedContextRows)
  totalsByStack.set(row.stackId, (totalsByStack.get(row.stackId) ?? 0) + 1);

/** Which stacks a member follows — in the app this comes from their onboarding preferences. */
function followedStacks(userId: string): string[] {
  const active = seedStacks.filter((stack) => stack.isActive).map((stack) => stack.id);
  const count = 1 + Math.floor(seeded(`${userId}-stacks`) * 3);
  return active.filter((_, index) => index % Math.max(1, Math.ceil(active.length / count)) === 0);
}

export function mockCheckOffDays(userId: string): CheckOffDay[] {
  // Two of the fifteen testers have never ticked anything; one stopped a fortnight ago.
  if (['user-4', 'user-13'].includes(userId)) return [];
  const lapsed = userId === 'user-8';
  const stacks = followedStacks(userId);

  const days: CheckOffDay[] = [];
  for (let daysAgo = 0; daysAgo < WINDOW; daysAgo += 1) {
    if (lapsed && daysAgo < 14) continue;
    const date = new Date(Date.now() - daysAgo * DAY_MS).toISOString().slice(0, 10);
    if (seeded(`${userId}-${date}-skip`) < 0.35) continue;

    const steps = stacks.flatMap((stackId) => {
      const rows = seedContextRows
        .filter((row) => row.stackId === stackId)
        .sort((a, b) => a.stackSortOrder - b.stackSortOrder);
      const take = Math.round(rows.length * (0.4 + seeded(`${userId}-${date}-${stackId}`) * 0.6));
      return rows.slice(0, take).map((row) => ({
        stepId: row.id,
        microActionId: row.microActionId,
        microActionTitle: row.microActionTitle,
        stackId,
        stackTitle: stackTitle(stackId),
      }));
    });
    if (!steps.length) continue;

    const grouped = new Map<string, number>();
    steps.forEach((step) => grouped.set(step.stackId, (grouped.get(step.stackId) ?? 0) + 1));
    days.push({
      day: date,
      updatedAt: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
      stepCount: steps.length,
      steps,
      stacks: [...grouped.entries()]
        .map(([stackId, completed]) => ({
          stackId,
          stackTitle: stackTitle(stackId),
          completed,
          total: totalsByStack.get(stackId) ?? completed,
        }))
        .sort((a, b) => b.completed - a.completed),
    });
  }
  return days; // newest first
}

const NEEDS = ['regulate', 'activate', 'build', 'recover'];
const TIMINGS = ['morning', 'midday', 'evening'];
const FOCUS = ['sleep', 'energy', 'brain', 'stress', 'gut'];
const BUDGETS = ['essential', 'balanced', 'full'];

export function mockPreferences(userId: string): UserPreferences {
  const selected = seeded(`${userId}-prefs`) > 0.2;
  if (!selected)
    return { need: null, timing: null, focus: null, budget: null, selected: false, setAt: null };
  const pick = (list: string[], salt: string) =>
    list[Math.floor(seeded(`${userId}-${salt}`) * list.length) % list.length];
  return {
    need: pick(NEEDS, 'need'),
    timing: pick(TIMINGS, 'timing'),
    focus: pick(FOCUS, 'focus'),
    budget: pick(BUDGETS, 'budget'),
    selected: true,
    setAt: new Date(Date.now() - 20 * DAY_MS).toISOString(),
  };
}
