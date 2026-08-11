import type { ContextRow, MicroAction, Mode } from '@/types/models';

const rank: Record<Mode, number> = { essential: 0, balanced: 1, full: 2 };
export const appearsInMode = (includedFrom: Mode, preview: Mode) =>
  rank[includedFrom] <= rank[preview];
export const derivedModes = (mode: Mode): Mode[] =>
  mode === 'essential'
    ? ['essential', 'balanced', 'full']
    : mode === 'balanced'
      ? ['balanced', 'full']
      : ['full'];
export function durationForMode(rows: ContextRow[], actions: MicroAction[], mode: Mode) {
  return rows
    .filter((row) => appearsInMode(row.includedInMode, mode))
    .reduce((sum, row) => {
      const action = actions.find((item) => item.id === row.microActionId);
      return sum + (row.durationOverrideMin ?? action?.durationMin ?? 0);
    }, 0);
}
