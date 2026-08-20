import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { UserRoutineAction } from '@/types/models';
import { labelFor } from '@/lib/constants/enums';
import { EmptyState } from '@/components/data/empty-state';

/**
 * The member's own ordering, shown exactly as they arranged it. Nothing here is editable — this
 * panel observes routines, it does not author them.
 */
export function RoutineActionList({ actions }: { actions: UserRoutineAction[] }) {
  if (!actions.length)
    return (
      <div className="card p-5">
        <EmptyState
          title="No actions in this routine"
          description="The member has not added any actions yet."
        />
      </div>
    );
  return (
    <div className="card overflow-hidden">
      {actions.map((action, index) => (
        <div
          key={action.id}
          className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0 sm:grid-cols-[2rem_minmax(180px,1fr)_5rem_5rem_7rem_5rem] ${
            action.isActive ? '' : 'bg-slate-50/60'
          }`}
        >
          <span className="text-sm font-semibold tabular-nums text-slate-400">{index + 1}</span>
          <div className="min-w-0">
            <Link
              href={`/micro-actions/${action.microActionId}`}
              className={`font-medium hover:text-[#236b5b] ${action.isActive ? 'text-slate-900' : 'text-slate-500'}`}
            >
              {action.title}
            </Link>
            <span className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">
                {action.microActionId ?? 'Custom action'}
              </span>
              {action.isUserAdded && (
                <span className="badge border-violet-200 bg-violet-50 text-[11px] text-violet-700">
                  <Plus className="mr-0.5 size-3" />
                  Added by member
                </span>
              )}
            </span>
          </div>
          <span className="hidden text-sm tabular-nums text-slate-600 sm:block">
            {action.startTime ?? '—'}
          </span>
          <span className="hidden text-sm tabular-nums text-slate-600 sm:block">
            {action.durationLabel ?? (action.durationMin ? action.durationMin + ' min' : '—')}
          </span>
          <span className="hidden text-xs text-slate-500 sm:block">
            {action.depth ? labelFor(action.depth) : '—'}
          </span>
          <span
            className={`badge justify-self-start text-[11px] ${
              action.isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}
          >
            {action.isActive ? 'On' : 'Off'}
          </span>
        </div>
      ))}
    </div>
  );
}
