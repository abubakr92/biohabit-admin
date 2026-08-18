import type { DailyCompletion } from '@/types/models';

/**
 * Shared by the routine completion strip and the user activity heatmap. A day the member had
 * nothing scheduled is drawn hollow rather than as a miss — they cannot fail a day they were never
 * asked about, and colouring it red would misread the data.
 */
function tone(day: DailyCompletion) {
  if (day.planned === 0) return 'bg-slate-50 border border-dashed border-slate-200';
  if (day.started === 0) return 'bg-red-100 border border-red-200';
  if (day.percentage >= 90) return 'bg-[#236b5b] border border-[#236b5b]';
  if (day.percentage >= 70) return 'bg-[#4f9d89] border border-[#4f9d89]';
  if (day.percentage >= 40) return 'bg-[#9ccbbe] border border-[#9ccbbe]';
  return 'bg-[#d6e9e2] border border-[#c3ded4]';
}

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(iso));

const describe = (day: DailyCompletion) =>
  day.planned === 0
    ? `${formatDay(day.date)} · not scheduled`
    : `${formatDay(day.date)} · ${day.started} of ${day.planned} started (${day.percentage}%)`;

export function CompletionSquares({
  days,
  columns,
  label,
}: {
  days: DailyCompletion[];
  /** Omit for a single row; set to wrap into a grid. */
  columns?: number;
  label: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        role="img"
        aria-label={label}
        className={columns ? 'grid gap-1.5' : 'flex gap-1.5'}
        style={
          columns
            ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, minWidth: 320 }
            : undefined
        }
      >
        {days.map((day) => (
          <div
            key={day.date}
            title={describe(day)}
            className={`aspect-square min-w-5 rounded ${tone(day)}`}
          />
        ))}
      </div>
    </div>
  );
}

export function CompletionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-dashed border-slate-200 bg-slate-50" />
        Not scheduled
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-red-200 bg-red-100" />
        Nothing started
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-[#d6e9e2]" />
        <span className="size-3 rounded bg-[#9ccbbe]" />
        <span className="size-3 rounded bg-[#4f9d89]" />
        <span className="size-3 rounded bg-[#236b5b]" />
        Rising completion
      </span>
    </div>
  );
}
