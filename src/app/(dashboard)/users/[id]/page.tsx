'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Unlock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import {
  useUnlockUser,
  useUser,
  useUserActivity,
  useUserCheckOffs,
  useUserPreferences,
} from '@/lib/hooks/use-users';
import { labelFor } from '@/lib/constants/enums';
import { formatDate } from '@/lib/utils/format';
import { useToast } from '@/app/providers';
import { ActivityStrip } from './_components/activity-strip';
import { CheckOffList } from './_components/check-off-list';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const user = useUser(id);
  const preferences = useUserPreferences(id);
  const activity = useUserActivity(id);
  const checkOffs = useUserCheckOffs(id);
  const unlock = useUnlockUser();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  if (user.isLoading) return <LoadingState rows={8} />;
  if (user.isError || !user.data)
    return (
      <ErrorState message={user.error?.message ?? 'User not found.'} retry={() => user.refetch()} />
    );

  const item = user.data;
  // A member who signed up through the app carries a name; profiles created here do not.
  const registered = Boolean(item.name || item.verified);
  const rhythm = Math.min(item.rhythmDaysCount, 7);
  const days = checkOffs.data?.pages.flatMap((page) => page.days) ?? [];

  return (
    <>
      <Link
        href="/users"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="size-4" />
        Back to users
      </Link>
      <PageHeader
        eyebrow="Member"
        title={item.name || item.email}
        description={item.name ? item.email : 'Tester profile and routine activity.'}
        actions={
          item.unlockedAt ? (
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
              Unlocked
            </span>
          ) : (
            <button className="btn" onClick={() => setConfirming(true)}>
              <Unlock className="size-4" />
              Unlock now
            </button>
          )
        }
      />

      <div className="card mb-6 p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Access level">
            <span className="badge">{labelFor(item.accessLevel)}</span>
          </Fact>
          <Fact label="Account">{registered ? 'Registered' : 'Guest'}</Fact>
          <Fact label="Rhythm days">
            <span className="block w-40">
              <span className="mb-1 flex justify-between text-xs">
                <span className="font-semibold tabular-nums text-slate-800">{rhythm} / 7</span>
                <span className="text-slate-400">days</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-[#236b5b]"
                  style={{ width: `${(rhythm / 7) * 100}%` }}
                />
              </span>
            </span>
          </Fact>
          <Fact label="Unlocked at">{formatDate(item.unlockedAt)}</Fact>
          <Fact label="Last check-off">{formatDate(item.lastCheckOffAt)}</Fact>
          <Fact label="Created">{formatDate(item.createdAt)}</Fact>
        </dl>
      </div>

      {preferences.data?.selected && (
        <div className="card mb-6 p-5">
          <h2 className="font-semibold">Onboarding preferences</h2>
          <p className="mt-1 text-sm text-slate-500">
            What the member chose in the app. These map onto the same axes stacks are classified by.
          </p>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Need (function)">{labelFor(preferences.data.need ?? '—')}</Fact>
            <Fact label="Timing (daypart)">{labelFor(preferences.data.timing ?? '—')}</Fact>
            <Fact label="Focus (label)">{labelFor(preferences.data.focus ?? '—')}</Fact>
            <Fact label="Budget (mode)">{labelFor(preferences.data.budget ?? '—')}</Fact>
          </dl>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-3 font-semibold">Activity</h2>
        {activity.isLoading ? (
          <LoadingState rows={3} />
        ) : activity.isError ? (
          <ErrorState message={activity.error.message} retry={() => activity.refetch()} />
        ) : activity.data ? (
          <ActivityStrip activity={activity.data} />
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Recent check-offs</h2>
        {checkOffs.isLoading ? (
          <LoadingState rows={5} />
        ) : checkOffs.isError ? (
          <ErrorState message={checkOffs.error.message} retry={() => checkOffs.refetch()} />
        ) : (
          <CheckOffList
            days={days}
            hasMore={Boolean(checkOffs.hasNextPage)}
            loadingMore={checkOffs.isFetchingNextPage}
            onLoadMore={() => checkOffs.fetchNextPage()}
          />
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="Unlock this user now?"
        description={`${item.email} will receive immediate unlocked access. This administrative action takes effect right away.`}
        confirmLabel="Unlock user"
        pending={unlock.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          unlock.mutate(item.id, {
            onSuccess: () => {
              toast(`${item.email} unlocked.`);
              setConfirming(false);
              user.refetch();
            },
            onError: (error) => toast(error.message, 'error'),
          })
        }
      />
    </>
  );
}
