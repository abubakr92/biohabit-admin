'use client';
import { useMemo, useState } from 'react';
import type { AppUser } from '@/types/models';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { useUnlockUser, useUsers } from '@/lib/hooks/use-users';
import { relativeDays } from '@/lib/utils/format';
import { useToast } from '@/app/providers';
import { UserTable } from './_components/user-table';
type Filter = 'all' | 'silent' | 'unlocked' | 'locked';
export default function UsersPage() {
  const query = useUsers();
  const unlock = useUnlockUser();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<AppUser | null>(null);
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter(
        (user) =>
          filter === 'all' ||
          (filter === 'silent' && relativeDays(user.lastCheckOffAt) >= 3) ||
          (filter === 'unlocked' && Boolean(user.unlockedAt)) ||
          (filter === 'locked' && !user.unlockedAt),
      ),
    [query.data, filter],
  );
  const confirm = () =>
    selected &&
    unlock.mutate(selected.id, {
      onSuccess: () => {
        toast(`${selected.email} unlocked.`);
        setSelected(null);
      },
      onError: (e) => toast(e.message, 'error'),
    });
  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Monitor tester rhythm and manually unlock access when needed."
      />
      <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {(
          [
            ['all', 'All'],
            ['silent', 'Silent'],
            ['unlocked', 'Unlocked'],
            ['locked', 'Not unlocked'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${filter === value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <LoadingState rows={9} />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : filtered.length ? (
        <UserTable users={filtered} onUnlock={setSelected} />
      ) : (
        <EmptyState
          title="No users in this view"
          description="Choose another filter to see the remaining testers."
        />
      )}
      <ConfirmDialog
        open={Boolean(selected)}
        title="Unlock this user now?"
        description={`${selected?.email ?? 'This user'} will receive immediate unlocked access. This administrative action takes effect right away.`}
        confirmLabel="Unlock user"
        pending={unlock.isPending}
        onClose={() => setSelected(null)}
        onConfirm={confirm}
      />
    </>
  );
}
