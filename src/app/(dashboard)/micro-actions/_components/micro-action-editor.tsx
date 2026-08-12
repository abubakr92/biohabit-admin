'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { MicroAction } from '@/types/models';
import type { SubmitHelpers } from '@/types/api';
import type { MicroActionFormValues } from '@/lib/validation/micro-action';
import { applyFieldErrors } from '@/lib/api/field-errors';
import { useLabels } from '@/lib/hooks/use-labels';
import { useCreateMicroAction, useUpdateMicroAction } from '@/lib/hooks/use-micro-actions';
import { useToast } from '@/app/providers';
import { PageHeader } from '@/components/layout/page-header';
import { MicroActionForm } from './micro-action-form';
export function MicroActionEditor({ action }: { action?: MicroAction }) {
  const labels = useLabels();
  const create = useCreateMicroAction();
  const update = useUpdateMicroAction(action?.id ?? '');
  const router = useRouter();
  const toast = useToast();
  const submit = (
    values: MicroActionFormValues,
    { setError }: SubmitHelpers<MicroActionFormValues>,
  ) => {
    const onError = (error: Error) => {
      if (applyFieldErrors(error, setError))
        toast('Some fields need attention before this can be saved.', 'error');
      else toast(error.message, 'error');
    };
    if (action) update.mutate(values, { onSuccess: () => toast('Micro-action saved.'), onError });
    else
      create.mutate(values, {
        onSuccess: (created) => {
          toast('Micro-action created.');
          router.replace(`/micro-actions/${created.id}`);
        },
        onError,
      });
  };
  return (
    <>
      <Link
        href="/micro-actions"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="size-4" />
        Back to micro-actions
      </Link>
      <PageHeader
        eyebrow={action ? 'Edit micro-action' : 'New micro-action'}
        title={action?.title.en ?? 'Create a micro-action'}
        description="Define the reusable action here. Stack-specific timing and copy belong in Composition."
      />
      <MicroActionForm
        action={action}
        labels={labels.data ?? []}
        pending={create.isPending || update.isPending}
        onSubmit={submit}
      />
    </>
  );
}
