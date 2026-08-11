'use client';
import { useState } from 'react';
import type { Label } from '@/types/models';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { useDeleteLabel, useLabels } from '@/lib/hooks/use-labels';
import { useToast } from '@/app/providers';
import { LabelTable } from './_components/label-table';
export default function LabelsPage() {
  const query = useLabels();
  const remove = useDeleteLabel();
  const toast = useToast();
  const [selected, setSelected] = useState<Label | null>(null);
  const confirm = () =>
    selected &&
    remove.mutate(selected.id, {
      onSuccess: () => {
        toast('Label deleted.');
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
        title="Labels"
        description="Keep the shared taxonomy concise. Labels in use cannot be deleted."
      />
      {query.isLoading ? (
        <LoadingState rows={8} />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : (
        <LabelTable labels={query.data ?? []} onDelete={setSelected} />
      )}
      <ConfirmDialog
        open={Boolean(selected)}
        title="Delete this label?"
        description={
          selected?.usageCount
            ? `“${selected.name.en}” is used ${selected.usageCount} times. Deletion will be blocked until those references are removed.`
            : 'This label is unused and can be deleted permanently.'
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
