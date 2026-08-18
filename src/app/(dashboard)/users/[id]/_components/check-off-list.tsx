'use client';
import Link from 'next/link';
import type { CheckOffDay } from '@/types/models';
import { EmptyState } from '@/components/data/empty-state';

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${iso}T12:00:00Z`));

/**
 * One entry per day, because that is how the app records it: a single document per date holding
 * the steps ticked. Steps are grouped by the stack they belong to, so "3 of 4" is visible rather
 * than a bare count.
 */
export function CheckOffList({
  days,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  days: CheckOffDay[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!days.length)
    return (
      <div className="card p-5">
        <EmptyState
          title="No check-offs yet"
          description="This member has not ticked off any step in the app."
        />
      </div>
    );
  return (
    <div className="card overflow-hidden">
      {days.map((day) => (
        <div key={day.day} className="border-b border-slate-100 px-5 py-4 last:border-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{formatDay(day.day)}</h3>
            <span className="text-sm text-slate-500">
              <span className="font-semibold tabular-nums text-slate-800">{day.stepCount}</span>{' '}
              step
              {day.stepCount === 1 ? '' : 's'} completed
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {day.stacks.map((stack) => (
              <div key={stack.stackId}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/stacks/${stack.stackId}`}
                    className="text-sm font-medium text-slate-800 hover:text-[#236b5b] hover:underline"
                  >
                    {stack.stackTitle}
                  </Link>
                  <span className="text-xs tabular-nums text-slate-500">
                    {stack.completed} of {stack.total} steps
                  </span>
                  {stack.completed === stack.total && (
                    <span className="badge border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">
                      Complete
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {day.steps
                    .filter((step) => step.stackId === stack.stackId)
                    .map((step) => step.microActionTitle.en)
                    .join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <div className="border-t border-slate-200 p-3 text-center">
          <button className="btn" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading…' : 'Load older days'}
          </button>
        </div>
      )}
    </div>
  );
}
