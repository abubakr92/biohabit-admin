import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { AppUser } from '@/types/models';
export const getUsers = () => apiRequest<AppUser[]>(endpoints.users.list);
export const unlockUser = (id: string) =>
  apiRequest<AppUser>(endpoints.users.unlock(id), { method: 'POST' });
