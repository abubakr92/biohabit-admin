'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import type { MicroAction } from '@/types/models';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { useDeleteMicroAction, useMicroActions } from '@/lib/hooks/use-micro-actions';
import { useLabels } from '@/lib/hooks/use-labels';
import { useToast } from '@/app/providers';
import { MicroActionTable } from './_components/micro-action-table';
export default function MicroActionsPage() {
  const query = useMicroActions();
  const labels = useLabels();
  const remove = useDeleteMicroAction();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState<MicroAction | null>(null);
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter(
        (action) =>
          (!search ||
            `${action.title.en} ${action.title.nl}`.toLowerCase().includes(search.toLowerCase())) &&
          (!label || action.labels.includes(label)),
      ),
    [query.data, search, label],
  );
  const confirm = () =>
    selected &&
    remove.mutate(selected.id, {
      onSuccess: () => {
        toast('Micro-action deleted.');
        setSelected(null);
      },
      onError: (e) => {
        toast(e.message, 'error');
        setSelected(null);
      },
    });
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Micro-actions"
        description="Reusable behavioural units. Stack-specific behaviour is configured in Composition."
        actions={
          <Link href="/micro-actions/new" className="btn btn-primary">
            <Plus className="size-4" />
            New micro-action
          </Link>
        }
      />
      <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <input
            className="field pl-9"
            placeholder="Search micro-actions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="field sm:w-52" value={label} onChange={(e) => setLabel(e.target.value)}>
          <option value="">All labels</option>
          {labels.data?.map((item) => (
            <option key={item.id} value={item.key}>
              {item.name.en}
            </option>
          ))}
        </select>
      </div>
      {query.isLoading ? (
        <LoadingState rows={8} />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : filtered.length ? (
        <MicroActionTable data={filtered} onDelete={setSelected} />
      ) : (
        <EmptyState
          title="No micro-actions found"
          description="Change your filters or create a new reusable action."
        />
      )}
      <ConfirmDialog
        open={Boolean(selected)}
        title={
          selected?.usedInStacksCount ? 'Check usage before deleting' : 'Delete this micro-action?'
        }
        description={
          selected?.usedInStacksCount
            ? `This action reports usage in ${selected.usedInStacksCount} stacks. Deletion will be blocked and the dependent stacks will be listed.`
            : 'This permanently removes the action. This cannot be undone.'
        }
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onClose={() => setSelected(null)}
        onConfirm={confirm}
      />
    </>
  );
}
