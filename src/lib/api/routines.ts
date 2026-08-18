import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type {
  DailyCompletion,
  RoutineDivergence,
  UserRoutine,
  UserRoutineAction,
} from '@/types/models';
import type { RoutineFilters, RoutineListResponse } from '@/types/api';

/** Member-owned routines are read-only in this panel — there are deliberately no mutations here. */

export const ROUTINE_STRIP_DAYS = 14;

export function getRoutines(filters: RoutineFilters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  const suffix = query.toString();
  return apiRequest<RoutineListResponse>(
    suffix ? `${endpoints.routines.list}?${suffix}` : endpoints.routines.list,
  );
}

export const getRoutine = (id: string) => apiRequest<UserRoutine>(endpoints.routines.detail(id));

export const getRoutineActions = (id: string) =>
  apiRequest<UserRoutineAction[]>(endpoints.routines.actions(id));

/** Null for a routine built from scratch: there is no template to diverge from. */
export const getRoutineDivergence = (id: string) =>
  apiRequest<RoutineDivergence | null>(endpoints.routines.divergence(id));

export const getRoutineCompletion = (id: string, days: number = ROUTINE_STRIP_DAYS) =>
  apiRequest<DailyCompletion[]>(`${endpoints.routines.completion(id)}?days=${days}`);
