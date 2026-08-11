import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { Label } from '@/types/models';
export const getLabels = () => apiRequest<Label[]>(endpoints.labels.list);
export const createLabel = (input: Omit<Label, 'id' | 'usageCount'>) =>
  apiRequest<Label>(endpoints.labels.list, { method: 'POST', body: JSON.stringify(input) });
export const updateLabel = (id: string, input: Partial<Pick<Label, 'key' | 'name'>>) =>
  apiRequest<Label>(endpoints.labels.detail(id), { method: 'PATCH', body: JSON.stringify(input) });
export const deleteLabel = (id: string) =>
  apiRequest<void>(endpoints.labels.detail(id), { method: 'DELETE' });
