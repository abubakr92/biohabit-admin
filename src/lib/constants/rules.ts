import type { Daypart, Mode } from '@/types/models';

/**
 * Guidance shown while composing a stack, not a limit the API enforces — nothing is ever rejected
 * for exceeding one. `null` means no cap: an evening wind-down legitimately runs past an hour, so
 * only Essential carries a target.
 */
export const MODE_CAPS: Record<Mode, number | null> = {
  essential: 10,
  balanced: null,
  full: null,
};

export const DAYPART_WINDOWS: Record<Daypart, string> = {
  morning: '06:00–11:00',
  midday: '11:00–17:00',
  evening: '17:00–23:00',
};
