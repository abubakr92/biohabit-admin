import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { AppUser } from '@/types/models';
import type { CheckOffPage, UserActivity, UserPage, UserStatus } from '@/types/api';
import type { UserRoutine } from '@/types/models';

export const USERS_PAGE_SIZE = 50;

export function getUsers({
  status,
  cursor,
  limit = USERS_PAGE_SIZE,
}: {
  status: UserStatus;
  cursor?: string;
  limit?: number;
}) {
  const query = new URLSearchParams({ status, limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<UserPage>(`${endpoints.users.list}?${query.toString()}`);
}

export const unlockUser = (id: string) =>
  apiRequest<AppUser>(endpoints.users.unlock(id), { method: 'POST' });

export const USER_ACTIVITY_DAYS = 30;
export const CHECK_OFFS_PAGE_SIZE = 50;

export const getUser = (id: string) => apiRequest<AppUser>(endpoints.users.detail(id));

export const getUserRoutines = (id: string) =>
  apiRequest<UserRoutine[]>(endpoints.users.routines(id));

export const getUserActivity = (id: string, days: number = USER_ACTIVITY_DAYS) =>
  apiRequest<UserActivity>(`${endpoints.users.activity(id)}?days=${days}`);

export function getUserCheckOffs({
  id,
  cursor,
  limit = CHECK_OFFS_PAGE_SIZE,
}: {
  id: string;
  cursor?: string;
  limit?: number;
}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<CheckOffPage>(`${endpoints.users.checkOffs(id)}?${query.toString()}`);
}
