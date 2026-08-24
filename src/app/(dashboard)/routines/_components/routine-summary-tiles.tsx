import { LayoutTemplate, ListChecks, Sparkles } from 'lucide-react';
import type { RoutineSummary } from '@/types/api';

/** Figures come from the API already aggregated; nothing here recomputes them. */
export function RoutineSummaryTiles({ summary }: { summary: RoutineSummary }) {
  const templateShare = summary.total
    ? Math.round((summary.fromTemplate / summary.total) * 100)
    : 0;
  const tiles = [
    {
      key: 'total',
      icon: ListChecks,
      label: 'Total routines',
      value: String(summary.total),
      hint: 'Across every member',
    },
    {
      key: 'split',
      icon: LayoutTemplate,
      label: 'From a template / custom',
      value: `${summary.fromTemplate} / ${summary.custom}`,
      hint: `${templateShare}% started from the Library`,
    },
    {
      key: 'average',
      icon: Sparkles,
      label: 'Average actions',
      value: summary.averageActions.toFixed(1),
      hint: 'Per routine',
    },
  ];
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <div key={tile.key} className="card p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-slate-400">
            <tile.icon className="size-4 text-[#236b5b]" />
            {tile.label}
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{tile.value}</p>
          <p className="mt-1 text-xs text-slate-500">{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}
