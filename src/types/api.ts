import type { FieldValues, UseFormSetError } from 'react-hook-form';
import type { AppUser, CheckOff, DailyCompletion, UserRoutine } from './models';

export interface ApiFieldErrors {
  [field: string]: string[];
}
/** Passed from a form to its submit handler so a 422 can be shown on the offending field. */
export interface SubmitHelpers<T extends FieldValues> {
  setError: UseFormSetError<T>;
}
export interface ApiList<T> {
  data: T[];
  total: number;
}
export interface ApiSuccess<T> {
  data: T;
}
export interface SessionUser {
  id: string;
  email: string;
  accessLevel: 'admin' | 'free' | 'premium' | 'test';
}

export type UserStatus = 'all' | 'silent' | 'unlocked' | 'locked';

/**
 * Row shape for the users list. `routineCount` is supplied by the API rather than tallied in the
 * table, for the same reason the routine summary is: the real backend gets one clear contract.
 * Extends AppUser, so anything already accepting an AppUser keeps working.
 */
export interface UserRow extends AppUser {
  routineCount: number;
}

/** `/users` is paginated: the collection grows with every app signup and is never loaded whole. */
export interface UserPage {
  users: UserRow[];
  nextCursor: string | null;
}

/** Aggregates for the routines summary tiles, computed by the API so no client re-derives them. */
export interface RoutineSummary {
  total: number;
  fromTemplate: number;
  custom: number;
  averageActions: number;
}

export interface RoutineListResponse {
  routines: UserRoutine[];
  summary: RoutineSummary;
}

export interface RoutineFilters {
  search?: string;
  source?: string;
  status?: string;
  mode?: string;
  userId?: string;
}

/** The 30-day strip plus the headline numbers above it, again server-computed. */
export interface UserActivity {
  days: DailyCompletion[];
  currentStreak: number;
  daysAtOrAbove70: number;
  totalCheckOffs: number;
}

export interface CheckOffPage {
  checkOffs: CheckOff[];
  nextCursor: string | null;
}
