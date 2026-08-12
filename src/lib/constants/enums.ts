import type { Daypart, FunctionTag, Level, Mode, TimingType } from '@/types/models';

export const functionTags: FunctionTag[] = ['regulate', 'activate', 'build', 'recover'];
export const dayparts: Daypart[] = ['morning', 'midday', 'evening'];
export const modes: Mode[] = ['essential', 'balanced', 'full'];
export const timingTypes: TimingType[] = ['none', 'exact', 'window', 'relative', 'anchor'];
// TODO(client): confirm allowed levels before launch. See the full change list on Level in
// src/types/models.ts — all seven declarations must move together.
export const levels: Level[] = ['beginner', 'intermediate', 'advanced'];

export const labelFor = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
