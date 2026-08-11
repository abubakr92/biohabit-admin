'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { useStacks } from '@/lib/hooks/use-stacks';
import { useLabels } from '@/lib/hooks/use-labels';
import { StackFilters, type StackFiltersValue } from './_components/stack-filters';
import { StackTable } from './_components/stack-table';
const initial: StackFiltersValue = {
  search: '',
  functionTag: '',
  daypart: '',
  label: '',
  active: '',
};
export default function StacksPage() {
  const stacks = useStacks();
  const labels = useLabels();
  const [filters, setFilters] = useState(initial);
  const filtered = useMemo(
    () =>
      (stacks.data ?? []).filter((stack) => {
        const search = filters.search.toLowerCase();
        const daypartMatch =
          !filters.daypart ||
          (filters.daypart === 'morning'
            ? stack.suggestedTiming.en.toLowerCase().includes('waking')
            : filters.daypart === 'midday'
              ? stack.suggestedTiming.en.toLowerCase().includes('midday')
              : stack.suggestedTiming.en.toLowerCase().includes('evening'));
        return (
          (!search || `${stack.title.en} ${stack.title.nl}`.toLowerCase().includes(search)) &&
          (!filters.functionTag || stack.functionTag === filters.functionTag) &&
          daypartMatch &&
          (!filters.label ||
            stack.primaryLabel === filters.label ||
            stack.supportingLabels.includes(filters.label)) &&
          (!filters.active || stack.isActive === (filters.active === 'active'))
        );
      }),
    [stacks.data, filters],
  );
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Stacks"
        description="Build and publish the routines people experience in the BIOHABIT app."
        actions={
          <Link className="btn btn-primary" href="/stacks/new">
            <Plus className="size-4" />
            New stack
          </Link>
        }
      />
      <StackFilters value={filters} labels={labels.data ?? []} onChange={setFilters} />
      {stacks.isLoading ? (
        <LoadingState rows={8} />
      ) : stacks.isError ? (
        <ErrorState message={stacks.error.message} retry={() => stacks.refetch()} />
      ) : filtered.length ? (
        <StackTable data={filtered} />
      ) : (
        <EmptyState
          title={
            filters.search ||
            filters.functionTag ||
            filters.label ||
            filters.active ||
            filters.daypart
              ? 'No matching stacks'
              : 'No stacks yet'
          }
          description="Adjust your filters or create a new stack to get started."
          action={
            <button className="btn" onClick={() => setFilters(initial)}>
              Clear filters
            </button>
          }
        />
      )}
    </>
  );
}
