import type { FieldValues, UseFormSetError } from 'react-hook-form';
import type { AppUser } from './models';

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
/** `/users` is paginated: the collection grows with every app signup and is never loaded whole. */
export interface UserPage {
  users: AppUser[];
  nextCursor: string | null;
}
