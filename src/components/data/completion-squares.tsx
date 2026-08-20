import type { DayActivity } from '@/types/models';

/**
 * Shared by the routine completion strip and the user activity strip.
 *
 * Shades each day by how many steps were ticked, relative to the busiest day in the same window —
 * not by a percentage. Which steps a member was *meant* to do that day is decided in the app from
 * their preferences, so the panel has no honest denominator; showing a percentage would look
 * precise while being invented.
 */
function tone(day: DayActivity, busiest: number) {
  if (day.stepsCompleted === 0) return 'bg-slate-100 border border-slate-200';
  const share = busiest > 0 ? day.stepsCompleted / busiest : 0;
  if (share >= 0.75) return 'bg-[#236b5b] border border-[#236b5b]';
  if (share >= 0.45) return 'bg-[#4f9d89] border border-[#4f9d89]';
  if (share >= 0.2) return 'bg-[#9ccbbe] border border-[#9ccbbe]';
  return 'bg-[#d6e9e2] border border-[#c3ded4]';
}

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(
    new Date(`${iso}T12:00:00Z`),
  );

const describe = (day: DayActivity) =>
  `${formatDay(day.date)} · ${day.stepsCompleted} step${day.stepsCompleted === 1 ? '' : 's'}`;

export function CompletionSquares({
  days,
  columns,
  label,
}: {
  days: DayActivity[];
  /** Omit for a single row; set to wrap into a grid. */
  columns?: number;
  label: string;
}) {
  const busiest = Math.max(...days.map((day) => day.stepsCompleted), 0);
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
            className={`${columns ? 'aspect-square min-w-5' : 'size-6 shrink-0'} rounded ${tone(day, busiest)}`}
          />
        ))}
      </div>
    </div>
  );
}

export function CompletionLegend({ busiest }: { busiest?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-slate-200 bg-slate-100" />
        Nothing ticked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-[#d6e9e2]" />
        <span className="size-3 rounded bg-[#9ccbbe]" />
        <span className="size-3 rounded bg-[#4f9d89]" />
        <span className="size-3 rounded bg-[#236b5b]" />
        More steps{busiest ? ` (busiest day: ${busiest})` : ''}
      </span>
    </div>
  );
}
