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
/**
 * A routine action's `depth` arrives in the app's own vocabulary. Its Build 8 change log maps it
 * one-to-one onto a row's `includedInMode`: light = Essential, medium = Balanced, deep = Full.
 * Display-only — the stored value is the app's and is never rewritten here.
 */
const appDepth: Record<string, Mode> = { light: 'essential', medium: 'balanced', deep: 'full' };
export const modeOfDepth = (depth: string): Mode | null =>
  appDepth[depth] ?? (depth in rank ? (depth as Mode) : null);
export function durationForMode(rows: ContextRow[], actions: MicroAction[], mode: Mode) {
  return rows
    .filter((row) => appearsInMode(row.includedInMode, mode))
    .reduce((sum, row) => {
      const action = actions.find((item) => item.id === row.microActionId);
      return sum + (row.durationOverrideMin ?? action?.durationMin ?? 0);
    }, 0);
}
