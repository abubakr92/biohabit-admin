import { ArrowUpDown, Clock, GitCompare, Minus, Plus, Type } from 'lucide-react';
import type { RoutineDivergence } from '@/types/models';

/**
 * What the member changed after adopting the template. Only shown for template-derived routines —
 * a routine built from scratch has nothing to diverge from.
 */
export function RoutineDivergencePanel({
  divergence,
  templateTitle,
}: {
  divergence: RoutineDivergence;
  templateTitle: string | null;
}) {
  const changes = [
    divergence.nameChanged && { key: 'name', icon: Type, text: 'Renamed from the template' },
    divergence.actionsAdded > 0 && {
      key: 'added',
      icon: Plus,
      text: `${divergence.actionsAdded} action${divergence.actionsAdded === 1 ? '' : 's'} added`,
    },
    divergence.actionsRemoved > 0 && {
      key: 'removed',
      icon: Minus,
      text: `${divergence.actionsRemoved} action${divergence.actionsRemoved === 1 ? '' : 's'} removed`,
    },
    divergence.orderChanged && { key: 'order', icon: ArrowUpDown, text: 'Order changed' },
    divergence.timesChanged > 0 && {
      key: 'times',
      icon: Clock,
      text: `${divergence.timesChanged} time${divergence.timesChanged === 1 ? '' : 's'} shifted`,
    },
  ].filter(Boolean) as Array<{ key: string; icon: typeof Type; text: string }>;

  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <GitCompare className="size-4 text-[#236b5b]" />
        Diverged from template
      </h2>
      {changes.length ? (
        <>
          <p className="mt-1 text-sm text-slate-500">
            Changes the member made after starting from
            {templateTitle ? ` “${templateTitle}”` : ' the template'}.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {changes.map((change) => (
              <li key={change.key} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="flex size-6 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <change.icon className="size-3.5" />
                </span>
                {change.text}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          Unchanged — this routine still matches
          {templateTitle ? ` “${templateTitle}”` : ' its template'} exactly.
        </p>
      )}
    </div>
  );
}
