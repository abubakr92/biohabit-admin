import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { Stack } from '@/types/models';
export type StackInput = Omit<
  Stack,
  'id' | 'createdAt' | 'updatedAt' | 'actionCount' | 'modeDurations'
>;
export const getStacks = () => apiRequest<Stack[]>(endpoints.stacks.list);
export const getStack = (id: string) => apiRequest<Stack>(endpoints.stacks.detail(id));
export const createStack = (input: StackInput) =>
  apiRequest<Stack>(endpoints.stacks.list, { method: 'POST', body: JSON.stringify(input) });
export const updateStack = (id: string, input: Partial<StackInput>) =>
  apiRequest<Stack>(endpoints.stacks.detail(id), { method: 'PATCH', body: JSON.stringify(input) });
export const duplicateStack = (id: string) =>
  apiRequest<Stack>(endpoints.stacks.duplicate(id), { method: 'POST' });
export const deleteStack = (id: string) =>
  apiRequest<void>(endpoints.stacks.detail(id), { method: 'DELETE' });
