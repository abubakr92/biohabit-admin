import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { ContextRow } from '@/types/models';
export type ContextInput = Omit<ContextRow, 'id' | 'stackId'>;
export const getContextRows = (stackId: string) =>
  apiRequest<ContextRow[]>(endpoints.stacks.contexts(stackId));
export const createContextRow = (stackId: string, input: ContextInput) =>
  apiRequest<ContextRow>(endpoints.stacks.contexts(stackId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateContextRow = (id: string, input: Partial<ContextInput>) =>
  apiRequest<ContextRow>(endpoints.contextRows.detail(id), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const deleteContextRow = (id: string) =>
  apiRequest<void>(endpoints.contextRows.detail(id), { method: 'DELETE' });
export const reorderContextRows = (stackId: string, ids: string[]) =>
  apiRequest<void>(endpoints.contextRows.reorder, {
    method: 'POST',
    body: JSON.stringify({ stackId, ids }),
  });
