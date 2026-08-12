import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { AppUser } from '@/types/models';
import type { UserPage, UserStatus } from '@/types/api';

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
