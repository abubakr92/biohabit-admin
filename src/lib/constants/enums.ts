import type { Daypart, FunctionTag, Level, Mode, TimingType } from '@/types/models';

export const functionTags: FunctionTag[] = ['regulate', 'activate', 'build', 'recover'];
export const dayparts: Daypart[] = ['morning', 'midday', 'evening'];
export const modes: Mode[] = ['essential', 'balanced', 'full'];
export const timingTypes: TimingType[] = ['none', 'exact', 'window', 'relative', 'anchor'];
/**
 * What an editor may choose. Relative timing is not used in Build 1, so it is kept out of the
 * dropdown while staying in `TimingType` and in the stored schema — hiding a control is not the
 * same as dropping a field, and dropping one is not this panel's call.
 */
export const buildOneTimingTypes: TimingType[] = timingTypes.filter((type) => type !== 'relative');
// Difficulty, deliberately distinct from `modes` — see the Level type in types/models.ts.
export const levels: Level[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export const labelFor = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
