import { Flame } from 'lucide-react';
import type { UserActivity } from '@/types/api';
import { CompletionLegend, CompletionSquares } from '@/components/data/completion-squares';

/**
 * Steps completed per day, shaded against the member's own busiest day. Deliberately not a
 * percentage: which stacks a member is meant to follow is decided in the app from their
 * preferences, so the panel has no honest denominator to divide by.
 */
export function ActivityStrip({ activity }: { activity: UserActivity }) {
  const busiest = Math.max(...activity.days.map((day) => day.stepsCompleted), 0);
  const stats = [
    { key: 'streak', value: `${activity.currentStreak}`, label: 'Day streak' },
    {
      key: 'active',
      value: `${activity.activeDays}`,
      label: `Active days of ${activity.days.length}`,
    },
    { key: 'steps', value: `${activity.totalSteps}`, label: 'Steps completed' },
  ];
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Last {activity.days.length} days</h2>
        <div className="flex flex-wrap items-center gap-5">
          {stats.map((stat) => (
            <span key={stat.key} className="text-sm text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-slate-900">
                {stat.key === 'streak' && activity.currentStreak > 0 && (
                  <Flame className="size-4 text-amber-500" />
                )}
                {stat.value}
              </span>{' '}
              {stat.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <CompletionSquares
          days={activity.days}
          columns={10}
          label={`Steps ticked on each of the last ${activity.days.length} days`}
        />
      </div>
      <div className="mt-4">
        <CompletionLegend busiest={busiest} />
      </div>
    </div>
  );
}
