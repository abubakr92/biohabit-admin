'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trash2 } from 'lucide-react';
import type { Stack } from '@/types/models';
import type { SubmitHelpers } from '@/types/api';
import type { StackFormValues } from '@/lib/validation/stack';
import { applyFieldErrors } from '@/lib/api/field-errors';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { StackDetailsForm } from './stack-details-form';
import { CompositionTab } from './composition-tab';
import { useLabels } from '@/lib/hooks/use-labels';
import { useCreateStack, useDeleteStack, useUpdateStack } from '@/lib/hooks/use-stacks';
import { useToast } from '@/app/providers';
import { useRouter } from 'next/navigation';
export function StackEditor({ stack }: { stack?: Stack }) {
  const router = useRouter();
  const toast = useToast();
  const labels = useLabels();
  const create = useCreateStack();
  const update = useUpdateStack(stack?.id ?? '');
  const remove = useDeleteStack();
  const [tab, setTab] = useState<'details' | 'composition'>('details');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const submit = (values: StackFormValues, { setError }: SubmitHelpers<StackFormValues>) => {
    const onError = (error: Error) => {
      if (applyFieldErrors(error, setError))
        toast('Some fields need attention before this can be saved.', 'error');
      else toast(error.message, 'error');
    };
    if (stack) update.mutate(values, { onSuccess: () => toast('Stack details saved.'), onError });
    else
      create.mutate(values, {
        onSuccess: (created) => {
          toast('Stack saved. Composition is now available.');
          router.replace(`/stacks/${created.id}`);
        },
        onError,
      });
  };
  const destroy = () => {
    if (!stack) return;
    remove.mutate(stack.id, {
      onSuccess: () => {
        toast('Stack deleted.');
        router.replace('/stacks');
      },
      onError: (error) => {
        setConfirmDelete(false);
        toast(error.message, 'error');
      },
    });
  };
  return (
    <>
      <Link
        href="/stacks"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="size-4" />
        Back to stacks
      </Link>
      <PageHeader
        eyebrow={stack ? (stack.isActive ? 'Active stack' : 'Draft stack') : 'New stack'}
        title={stack?.title.en || 'Create a stack'}
        description={
          stack
            ? 'Manage the stack details and the actions that compose each mode.'
            : 'Start with a title. The remaining copy is required only when you publish.'
        }
        actions={
          stack ? (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
              Delete stack
            </button>
          ) : undefined
        }
      />
      <div className="mb-6 flex border-b border-slate-200">
        <button
          className={`border-b-2 px-5 py-3 text-sm font-semibold ${tab === 'details' ? 'border-[#236b5b] text-[#195548]' : 'border-transparent text-slate-500'}`}
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          disabled={!stack}
          className={`border-b-2 px-5 py-3 text-sm font-semibold ${tab === 'composition' ? 'border-[#236b5b] text-[#195548]' : 'border-transparent text-slate-500'}`}
          onClick={() => stack && setTab('composition')}
        >
          Composition
        </button>
        {!stack && <span className="self-center text-xs text-slate-400">Save first to unlock</span>}
      </div>
      {tab === 'details' ? (
        <StackDetailsForm
          stack={stack}
          labels={labels.data ?? []}
          pending={create.isPending || update.isPending}
          onSubmit={submit}
          onBlockedActive={(message) => toast(message, 'error')}
        />
      ) : stack ? (
        <CompositionTab stack={stack} />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this stack?"
        description={`“${stack?.title.en ?? 'This stack'}” and its ${stack?.actionCount ?? 0} context rows will be removed permanently. The reusable micro-actions stay available.`}
        confirmLabel="Delete stack"
        danger
        pending={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={destroy}
      />
    </>
  );
}
