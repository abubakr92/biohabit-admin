import { Flame } from 'lucide-react';
import type { UserActivity } from '@/types/api';
import type { DayActivity } from '@/types/models';

/**
 * Steps completed per day, shaded against the member's own busiest day. Deliberately not a
 * percentage: which stacks a member is meant to follow is decided in the app from their
 * preferences, so the panel has no honest denominator to divide by.
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
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(iso));

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
      <div className="mt-4 overflow-x-auto">
        <div
          role="img"
          aria-label={`Steps completed on each of the last ${activity.days.length} days`}
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', minWidth: 320 }}
        >
          {activity.days.map((day) => (
            <div
              key={day.date}
              title={`${formatDay(day.date)} · ${day.stepsCompleted} step${day.stepsCompleted === 1 ? '' : 's'}`}
              className={`aspect-square min-w-5 rounded ${tone(day, busiest)}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-slate-200 bg-slate-100" />
          Nothing completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-[#d6e9e2]" />
          <span className="size-3 rounded bg-[#9ccbbe]" />
          <span className="size-3 rounded bg-[#4f9d89]" />
          <span className="size-3 rounded bg-[#236b5b]" />
          More steps {busiest > 0 && `(busiest day: ${busiest})`}
        </span>
      </div>
    </div>
  );
}
