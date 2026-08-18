'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { useRoutines } from '@/lib/hooks/use-routines';
import { useUsers } from '@/lib/hooks/use-users';
import { RoutineFilters, type RoutineFiltersValue } from './_components/routine-filters';
import { RoutineSummaryTiles } from './_components/routine-summary-tiles';
import { RoutineTable } from './_components/routine-table';

const initial: RoutineFiltersValue = { search: '', source: '', status: '', mode: '', userId: '' };

export default function RoutinesPage() {
  const [filters, setFilters] = useState(initial);
  const query = useRoutines(filters);
  // Only to name the owners in the filter dropdown; the routines themselves carry the email.
  const users = useUsers('all');
  const owners = users.data?.pages.flatMap((page) => page.users) ?? [];
  const routines = query.data?.routines ?? [];
  const dirty = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Routines"
        description="Every routine members have built for themselves. Read-only — routines belong to the member who created them."
      />
      {query.data && <RoutineSummaryTiles summary={query.data.summary} />}
      <RoutineFilters value={filters} users={owners} onChange={setFilters} />
      {query.isLoading ? (
        <LoadingState rows={8} />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : routines.length ? (
        <RoutineTable data={routines} />
      ) : (
        <EmptyState
          title={dirty ? 'No matching routines' : 'No routines yet'}
          description={
            dirty
              ? 'Adjust the filters to widen the search.'
              : 'Routines appear here once members start building them in the app.'
          }
          action={
            dirty ? (
              <button className="btn" onClick={() => setFilters(initial)}>
                Clear filters
              </button>
            ) : undefined
          }
        />
      )}
    </>
  );
}
