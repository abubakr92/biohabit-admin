import Link from 'next/link';
import type { UserRoutine, Weekday } from '@/types/models';
import { DataTable, type Column } from '@/components/data/data-table';
import { labelFor } from '@/lib/constants/enums';
import { formatDate } from '@/lib/utils/format';

const WEEK: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function WeekdayDots({ weekdays }: { weekdays: Weekday[] }) {
  return (
    <span className="flex gap-0.5" title={weekdays.map((day) => labelFor(day)).join(', ')}>
      {WEEK.map((day) => (
        <span
          key={day}
          className={`flex size-5 items-center justify-center rounded text-[10px] font-semibold uppercase ${
            weekdays.includes(day) ? 'bg-[#eaf5f1] text-[#195548]' : 'bg-slate-100 text-slate-300'
          }`}
        >
          {day.charAt(0)}
        </span>
      ))}
    </span>
  );
}

export function RoutineStatusBadge({ status }: { status: UserRoutine['status'] }) {
  const tone =
    status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'expired'
        ? 'border-slate-200 bg-slate-100 text-slate-500'
        : 'border-amber-200 bg-amber-50 text-amber-700';
  return <span className={`badge ${tone}`}>{labelFor(status)}</span>;
}

/** Read-only: rows link through to the detail view and offer no edit affordance anywhere. */
export function RoutineTable({ data }: { data: UserRoutine[] }) {
  const columns: Column<UserRoutine>[] = [
    {
      key: 'title',
      header: 'Routine',
      render: (routine) => (
        <Link
          href={`/routines/${routine.id}`}
          className="font-semibold text-slate-900 hover:text-[#236b5b]"
        >
          {routine.title}
        </Link>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (routine) => (
        <Link
          href={`/users/${routine.userId}`}
          className="text-slate-600 hover:text-[#236b5b] hover:underline"
        >
          {routine.userEmail}
        </Link>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (routine) =>
        routine.source === 'template' ? (
          <span className="badge border-blue-200 bg-blue-50 text-blue-700">
            {routine.sourceStackTitle}
          </span>
        ) : (
          <span className="badge">Custom</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (routine) => <span className="tabular-nums">{routine.actionCount}</span>,
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (routine) => <span className="text-slate-600">{labelFor(routine.mode)}</span>,
    },
    {
      key: 'weekdays',
      header: 'Days',
      render: (routine) => <WeekdayDots weekdays={routine.weekdays} />,
    },
    {
      key: 'anchor',
      header: 'Anchor',
      render: (routine) => (
        <span className="tabular-nums text-slate-600">{routine.startsAt ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (routine) => <RoutineStatusBadge status={routine.status} />,
    },
    {
      key: 'created',
      header: 'Created',
      render: (routine) => <span className="text-slate-500">{formatDate(routine.createdAt)}</span>,
    },
  ];
  return <DataTable data={data} columns={columns} />;
}
