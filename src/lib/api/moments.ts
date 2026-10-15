import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { Daypart, Moment, MomentKey } from '@/types/models';

/** Every value is required: the API only stores a moment once it is complete. */
export interface MomentInput {
  label: Moment['label'];
  daypart: Daypart;
  defaultTime: string;
}
export const getMoments = () => apiRequest<Moment[]>(endpoints.moments.list);
export const updateMoment = (key: MomentKey, input: MomentInput) =>
  apiRequest<Moment>(endpoints.moments.detail(key), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
