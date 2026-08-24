import type { DayActivity } from '@/types/models';
import { CompletionLegend, CompletionSquares } from '@/components/data/completion-squares';

export function RoutineCompletionStrip({ days }: { days: DayActivity[] }) {
  const active = days.filter((day) => day.stepsCompleted > 0);
  const busiest = Math.max(...days.map((day) => day.stepsCompleted), 0);
  const total = days.reduce((sum, day) => sum + day.stepsCompleted, 0);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Last {days.length} days</h2>
        <p className="text-sm text-slate-500">
          <span className="font-semibold tabular-nums text-slate-900">{total}</span> step
          {total === 1 ? '' : 's'} across{' '}
          <span className="font-semibold tabular-nums text-slate-900">{active.length}</span> day
          {active.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="mt-4">
        <CompletionSquares
          days={days}
          label={`Steps ticked on each of the last ${days.length} days`}
        />
      </div>
      <div className="mt-4">
        <CompletionLegend busiest={busiest} />
      </div>
    </div>
  );
}
