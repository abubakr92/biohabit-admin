import type { DailyCompletion } from '@/types/models';
import { CompletionLegend, CompletionSquares } from '@/components/data/completion-squares';

export function RoutineCompletionStrip({ days }: { days: DailyCompletion[] }) {
  const scheduled = days.filter((day) => day.planned > 0);
  const average = scheduled.length
    ? Math.round(scheduled.reduce((sum, day) => sum + day.percentage, 0) / scheduled.length)
    : 0;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Last {days.length} days</h2>
        <p className="text-sm text-slate-500">
          <span className="font-semibold tabular-nums text-slate-900">{average}%</span> average on
          the {scheduled.length} scheduled day{scheduled.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="mt-4">
        <CompletionSquares days={days} label={`Completion for the last ${days.length} days`} />
      </div>
      <div className="mt-4">
        <CompletionLegend />
      </div>
    </div>
  );
}
