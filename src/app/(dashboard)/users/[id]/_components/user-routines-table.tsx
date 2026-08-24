import Link from 'next/link';
import type { UserRoutine } from '@/types/models';
import { DataTable, type Column } from '@/components/data/data-table';
import { EmptyState } from '@/components/data/empty-state';
import { labelFor } from '@/lib/constants/enums';
import {
  RoutineStatusBadge,
  WeekdayDots,
} from '@/app/(dashboard)/routines/_components/routine-table';

/** Compact view of what this member owns; the full picture lives on /routines. */
export function UserRoutinesTable({ routines }: { routines: UserRoutine[] }) {
  if (!routines.length)
    return (
      <div className="card p-5">
        <EmptyState
          title="No routines yet"
          description="This member has not built a routine in the app."
        />
      </div>
    );

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
      key: 'status',
      header: 'Status',
      render: (routine) => <RoutineStatusBadge status={routine.status} />,
    },
  ];
  return <DataTable data={routines} columns={columns} />;
}
