'use client';
import { useQuery } from '@tanstack/react-query';
import {
  getRoutine,
  getRoutineActions,
  getRoutineCompletion,
  getRoutineDivergence,
  ROUTINE_STRIP_DAYS,
} from '@/lib/api/routines';
import { getRoutines } from '@/lib/api/routines';
import type { RoutineFilters } from '@/types/api';

/** Read-only by design: routines belong to members, so this panel never mutates them. */
export const routineKeys = {
  all: ['routines'] as const,
  list: (filters: RoutineFilters) => ['routines', 'list', filters] as const,
  detail: (id: string) => ['routines', id] as const,
  actions: (id: string) => ['routines', id, 'actions'] as const,
  divergence: (id: string) => ['routines', id, 'divergence'] as const,
  completion: (id: string, days: number) => ['routines', id, 'completion', days] as const,
};

export const useRoutines = (filters: RoutineFilters) =>
  useQuery({ queryKey: routineKeys.list(filters), queryFn: () => getRoutines(filters) });

export const useRoutine = (id: string) =>
  useQuery({
    queryKey: routineKeys.detail(id),
    queryFn: () => getRoutine(id),
    enabled: Boolean(id),
  });

export const useRoutineActions = (id: string) =>
  useQuery({
    queryKey: routineKeys.actions(id),
    queryFn: () => getRoutineActions(id),
    enabled: Boolean(id),
  });

export const useRoutineDivergence = (id: string) =>
  useQuery({
    queryKey: routineKeys.divergence(id),
    queryFn: () => getRoutineDivergence(id),
    enabled: Boolean(id),
  });

export const useRoutineCompletion = (id: string, days: number = ROUTINE_STRIP_DAYS) =>
  useQuery({
    queryKey: routineKeys.completion(id, days),
    queryFn: () => getRoutineCompletion(id, days),
    enabled: Boolean(id),
  });
