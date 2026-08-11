import type { Daypart, Mode } from '@/types/models';

export const MODE_CAPS: Record<Mode, number> = { essential: 6, balanced: 15, full: 40 };
export const DAYPART_WINDOWS: Record<Daypart, string> = {
  morning: '06:00–11:00',
  midday: '11:00–17:00',
  evening: '17:00–23:00',
};
