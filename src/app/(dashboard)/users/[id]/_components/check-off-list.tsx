'use client';
import Link from 'next/link';
import type { CheckOff } from '@/types/models';
import { EmptyState } from '@/components/data/empty-state';
import { labelFor } from '@/lib/constants/enums';

const stamp = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

export function CheckOffList({
  checkOffs,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  checkOffs: CheckOff[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!checkOffs.length)
    return (
      <div className="card p-5">
        <EmptyState
          title="No check-offs recorded"
          description="This member has not started any action yet."
        />
      </div>
    );
  return (
    <div className="card overflow-hidden">
      {checkOffs.map((checkOff) => (
        <div
          key={checkOff.id}
          className="grid grid-cols-[8.5rem_1fr] items-baseline gap-3 border-b border-slate-100 px-4 py-3 last:border-0 sm:grid-cols-[8.5rem_minmax(160px,1fr)_minmax(140px,1fr)_6rem]"
        >
          <span className="text-sm tabular-nums text-slate-500">{stamp(checkOff.startedAt)}</span>
          <span className="text-sm font-medium text-slate-900">{checkOff.microActionTitle.en}</span>
          <Link
            href={`/routines/${checkOff.routineId}`}
            className="hidden text-sm text-slate-600 hover:text-[#236b5b] hover:underline sm:block"
          >
            {checkOff.routineTitle}
          </Link>
          <span className="badge hidden justify-self-start text-[11px] sm:inline-flex">
            {labelFor(checkOff.modeUsed)}
          </span>
        </div>
      ))}
      {hasMore && (
        <div className="border-t border-slate-200 p-3 text-center">
          <button className="btn" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading…' : 'Load more check-offs'}
          </button>
        </div>
      )}
    </div>
  );
}
