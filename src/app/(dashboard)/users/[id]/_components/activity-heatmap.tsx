import { Flame } from 'lucide-react';
import type { UserActivity } from '@/types/api';
import { CompletionLegend, CompletionSquares } from '@/components/data/completion-squares';

/** Streak, 70%-days and total check-offs all arrive pre-computed from the API. */
export function ActivityHeatmap({ activity }: { activity: UserActivity }) {
  const stats = [
    {
      key: 'streak',
      value: `${activity.currentStreak} day${activity.currentStreak === 1 ? '' : 's'}`,
      label: 'Current streak',
    },
    { key: 'strong', value: String(activity.daysAtOrAbove70), label: 'Days at 70% or above' },
    { key: 'total', value: String(activity.totalCheckOffs), label: 'Total check-offs' },
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
          label={`Daily completion across the last ${activity.days.length} days`}
        />
      </div>
      <div className="mt-4">
        <CompletionLegend />
      </div>
    </div>
  );
}
