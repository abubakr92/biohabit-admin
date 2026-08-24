'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Unlock, AlertCircle } from 'lucide-react';
import type { AppUser } from '@/types/models';
import type { UserRow } from '@/types/api';
import { DataTable, type Column } from '@/components/data/data-table';
import { formatDate, relativeDays } from '@/lib/utils/format';
import { labelFor } from '@/lib/constants/enums';
export function UserTable({
  users,
  onUnlock,
}: {
  users: UserRow[];
  onUnlock: (user: AppUser) => void;
}) {
  const router = useRouter();
  const columns: Column<UserRow>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <div>
          <Link
            href={`/users/${user.id}`}
            className="font-semibold hover:text-[#236b5b]"
            onClick={(event) => event.stopPropagation()}
          >
            {user.email}
          </Link>
          {relativeDays(user.lastCheckOffAt) >= 3 && (
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
              <AlertCircle className="size-3" />
              Silent tester
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Access level',
      render: (user) => <span className="badge">{labelFor(user.accessLevel)}</span>,
    },
    {
      key: 'rhythm',
      header: 'Rhythm days',
      render: (user) => (
        <div className="w-32">
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold tabular-nums">{user.rhythmDaysCount} / 7</span>
            <span className="text-slate-400">days</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#236b5b]"
              style={{ width: `${(user.rhythmDaysCount / 7) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'routines',
      header: 'Routines',
      render: (user) => (
        <span className={`tabular-nums ${user.routineCount ? 'text-slate-700' : 'text-slate-400'}`}>
          {user.routineCount}
        </span>
      ),
    },
    {
      key: 'checkoff',
      header: 'Last check-off',
      render: (user) => <span className="text-slate-600">{formatDate(user.lastCheckOffAt)}</span>,
    },
    {
      key: 'unlocked',
      header: 'Unlocked at',
      render: (user) => (
        <span className={user.unlockedAt ? 'text-slate-600' : 'text-slate-400'}>
          {formatDate(user.unlockedAt)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (user) =>
        user.unlockedAt ? (
          <span className="text-xs font-semibold text-emerald-700">Unlocked</span>
        ) : (
          <button
            className="btn h-9"
            onClick={(event) => {
              // The row navigates; unlocking must not also open the detail page behind the dialog.
              event.stopPropagation();
              onUnlock(user);
            }}
          >
            <Unlock className="size-4" />
            Unlock now
          </button>
        ),
    },
  ];
  return (
    <DataTable
      data={users}
      columns={columns}
      onRowClick={(user) => router.push(`/users/${user.id}`)}
      rowClassName={(user) => (relativeDays(user.lastCheckOffAt) >= 3 ? 'bg-amber-50/45' : '')}
    />
  );
}
