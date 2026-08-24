'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BellOff, BellRing, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import {
  useRoutine,
  useRoutineActions,
  useRoutineCompletion,
  useRoutineDivergence,
} from '@/lib/hooks/use-routines';
import { labelFor } from '@/lib/constants/enums';
import { formatDate } from '@/lib/utils/format';
import { RoutineStatusBadge, WeekdayDots } from '../_components/routine-table';
import { RoutineActionList } from '../_components/routine-action-list';
import { RoutineCompletionStrip } from '../_components/routine-completion-strip';
import { RoutineDivergencePanel } from '../_components/routine-divergence-panel';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function RoutinePage() {
  const { id } = useParams<{ id: string }>();
  const routine = useRoutine(id);
  const actions = useRoutineActions(id);
  const divergence = useRoutineDivergence(id);
  const completion = useRoutineCompletion(id);

  if (routine.isLoading) return <LoadingState rows={8} />;
  if (routine.isError || !routine.data)
    return (
      <ErrorState
        message={routine.error?.message ?? 'Routine not found.'}
        retry={() => routine.refetch()}
      />
    );

  const item = routine.data;
  return (
    <>
      <Link
        href="/routines"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="size-4" />
        Back to routines
      </Link>
      <PageHeader
        eyebrow="Member routine"
        title={item.title}
        description={item.description}
        actions={<RoutineStatusBadge status={item.status} />}
      />

      <div className="card mb-6 p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Owner">
            <Link href={`/users/${item.userId}`} className="text-[#236b5b] hover:underline">
              {item.userEmail}
            </Link>
          </Fact>
          <Fact label="Source">
            {item.source === 'template' && item.sourceStackId ? (
              <Link
                href={`/stacks/${item.sourceStackId}`}
                className="text-[#236b5b] hover:underline"
              >
                {item.sourceStackTitle}
              </Link>
            ) : (
              'Custom routine'
            )}
          </Fact>
          <Fact label="Mode">{labelFor(item.mode)}</Fact>
          <Fact label="Anchor time">
            <span className="tabular-nums">{item.startsAt ?? 'No start time'}</span>
          </Fact>
          <Fact label="Weekdays">
            <WeekdayDots weekdays={item.weekdays} />
          </Fact>
          <Fact label="Notifications">
            <span className="inline-flex items-center gap-1.5">
              {item.notificationOn ? (
                <BellRing className="size-4 text-[#236b5b]" />
              ) : (
                <BellOff className="size-4 text-slate-400" />
              )}
              {item.notificationOn ? 'On' : 'Off'}
            </span>
          </Fact>
          <Fact label="Created">{formatDate(item.createdAt)}</Fact>
          <Fact label="Last updated">{formatDate(item.updatedAt)}</Fact>
        </dl>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 font-semibold">
          {item.actionCount} action{item.actionCount === 1 ? '' : 's'}, in the member&rsquo;s order
        </h2>
        {actions.isLoading ? (
          <LoadingState rows={4} />
        ) : actions.isError ? (
          <ErrorState message={actions.error.message} retry={() => actions.refetch()} />
        ) : (
          <RoutineActionList actions={actions.data ?? []} />
        )}
      </section>

      <section className="mb-6">
        {completion.isLoading ? (
          <LoadingState rows={2} />
        ) : completion.isError ? (
          <ErrorState message={completion.error.message} retry={() => completion.refetch()} />
        ) : (
          <RoutineCompletionStrip days={completion.data ?? []} />
        )}
      </section>

      {item.source === 'template' && (
        <section>
          {divergence.isLoading ? (
            <LoadingState rows={2} />
          ) : divergence.isError ? (
            <ErrorState message={divergence.error.message} retry={() => divergence.refetch()} />
          ) : divergence.data ? (
            <RoutineDivergencePanel
              divergence={divergence.data}
              templateTitle={item.sourceStackTitle}
            />
          ) : null}
        </section>
      )}
    </>
  );
}
