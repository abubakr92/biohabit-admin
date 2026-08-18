import type { CheckOff, DailyCompletion, Weekday } from '@/types/models';
import { seeded, seedRoutineActions, seedRoutines } from './routines';

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
/** This member walked away a fortnight ago: planned stays, started drops to nothing. */
const LAPSED_USER_ID = 'user-8';
const LAPSED_AFTER_DAYS = 14;

const dayNames: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Days 0 (today) back to WINDOW_DAYS - 1, oldest first. */
const window = Array.from({ length: WINDOW_DAYS }, (_, offset) => {
  const daysAgo = WINDOW_DAYS - 1 - offset;
  const date = new Date(Date.now() - daysAgo * DAY_MS);
  return { daysAgo, date, key: dayKey(date), weekday: dayNames[date.getDay()] };
});

interface DayRecord extends DailyCompletion {
  routineId: string;
  userId: string;
  startedActionIds: string[];
}

/**
 * One record per routine per day. `planned` reflects the routine's schedule — nothing is planned on
 * a weekday it does not run, before it started, or after it expired — while `started` carries the
 * gaps. Check-offs are derived from the same records, so the two can never disagree.
 */
const records: DayRecord[] = seedRoutines.flatMap((routine) => {
  const actions = seedRoutineActions
    .filter((action) => action.routineId === routine.id && action.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const startedDaysAgo = Math.round((Date.now() - new Date(routine.startDate).getTime()) / DAY_MS);
  const endedDaysAgo = routine.endDate
    ? Math.round((Date.now() - new Date(routine.endDate).getTime()) / DAY_MS)
    : null;

  return window.map(({ daysAgo, key, weekday }) => {
    const scheduled =
      routine.weekdays.includes(weekday) &&
      daysAgo <= startedDaysAgo &&
      (endedDaysAgo === null || daysAgo > endedDaysAgo) &&
      routine.status !== 'inactive';
    const planned = scheduled ? actions.length : 0;

    let started = 0;
    if (planned > 0) {
      const lapsed = routine.userId === LAPSED_USER_ID && daysAgo < LAPSED_AFTER_DAYS;
      const roll = seeded(`${routine.id}-${key}`);
      // Roughly one day in six is missed outright; the rest land somewhere between half and all.
      if (!lapsed && roll > 0.17) started = Math.max(1, Math.round(planned * (0.5 + roll * 0.5)));
    }

    return {
      routineId: routine.id,
      userId: routine.userId,
      date: key,
      started,
      planned,
      percentage: planned === 0 ? 0 : Math.round((started / planned) * 100),
      startedActionIds: actions.slice(0, started).map((action) => action.id),
    };
  });
});

const strip = ({ date, started, planned, percentage }: DayRecord): DailyCompletion => ({
  date,
  started,
  planned,
  percentage,
});

/** Most recent `days` for one routine, oldest first. */
export function routineCompletion(routineId: string, days: number): DailyCompletion[] {
  return records
    .filter((record) => record.routineId === routineId)
    .slice(-days)
    .map(strip);
}

/** Most recent `days` for a member, summed across every routine they own, oldest first. */
export function userCompletion(userId: string, days: number): DailyCompletion[] {
  const totals = new Map<string, { started: number; planned: number }>();
  for (const record of records) {
    if (record.userId !== userId) continue;
    const total = totals.get(record.date) ?? { started: 0, planned: 0 };
    total.started += record.started;
    total.planned += record.planned;
    totals.set(record.date, total);
  }
  return window.slice(-days).map(({ key }) => {
    const total = totals.get(key) ?? { started: 0, planned: 0 };
    return {
      date: key,
      started: total.started,
      planned: total.planned,
      percentage: total.planned === 0 ? 0 : Math.round((total.started / total.planned) * 100),
    };
  });
}

/** Derived from the same day records, newest first. */
export const seedCheckOffs: CheckOff[] = records
  .flatMap((record) => {
    const routine = seedRoutines.find((item) => item.id === record.routineId)!;
    return record.startedActionIds.map((actionId, index) => {
      const action = seedRoutineActions.find((item) => item.id === actionId)!;
      const at = new Date(`${record.date}T${action.startTime ?? '08:00'}:00.000Z`);
      // Nudge each action a minute apart so two started in the same slot still order predictably.
      at.setUTCMinutes(at.getUTCMinutes() + index);
      return {
        id: `${actionId}-${record.date}`,
        userId: record.userId,
        routineId: record.routineId,
        routineTitle: routine.title,
        microActionTitle: action.microActionTitle,
        startedAt: at.toISOString(),
        modeUsed: routine.mode,
      };
    });
  })
  .sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime() || a.id.localeCompare(b.id),
  );
