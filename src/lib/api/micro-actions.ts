import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { MicroAction } from '@/types/models';
export type MicroActionInput = Omit<MicroAction, 'id' | 'usedInStacksCount'>;
export const getMicroActions = () => apiRequest<MicroAction[]>(endpoints.microActions.list);
export const getMicroAction = (id: string) =>
  apiRequest<MicroAction>(endpoints.microActions.detail(id));
export const createMicroAction = (input: MicroActionInput) =>
  apiRequest<MicroAction>(endpoints.microActions.list, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateMicroAction = (id: string, input: Partial<MicroActionInput>) =>
  apiRequest<MicroAction>(endpoints.microActions.detail(id), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const deleteMicroAction = (id: string) =>
  apiRequest<void>(endpoints.microActions.detail(id), { method: 'DELETE' });
