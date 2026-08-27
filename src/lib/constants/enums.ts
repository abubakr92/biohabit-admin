import type { Daypart, FunctionTag, Level, Mode, TimingType } from '@/types/models';

export const functionTags: FunctionTag[] = ['regulate', 'activate', 'build', 'recover'];
export const dayparts: Daypart[] = ['morning', 'midday', 'evening'];
export const modes: Mode[] = ['essential', 'balanced', 'full'];
export const timingTypes: TimingType[] = ['none', 'exact', 'window', 'relative', 'anchor'];
// Difficulty, deliberately distinct from `modes` — see the Level type in types/models.ts.
export const levels: Level[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export const labelFor = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
