'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Stack } from '@/types/models';
import type { StackFormValues } from '@/lib/validation/stack';
import { PageHeader } from '@/components/layout/page-header';
import { StackDetailsForm } from './stack-details-form';
import { CompositionTab } from './composition-tab';
import { useLabels } from '@/lib/hooks/use-labels';
import { useCreateStack, useUpdateStack } from '@/lib/hooks/use-stacks';
import { useToast } from '@/app/providers';
import { useRouter } from 'next/navigation';
export function StackEditor({ stack }: { stack?: Stack }) {
  const router = useRouter();
  const toast = useToast();
  const labels = useLabels();
  const create = useCreateStack();
  const update = useUpdateStack(stack?.id ?? '');
  const [tab, setTab] = useState<'details' | 'composition'>('details');
  const submit = (values: StackFormValues) => {
    if (stack)
      update.mutate(values, {
        onSuccess: () => toast('Stack details saved.'),
        onError: (e) => toast(e.message, 'error'),
      });
    else
      create.mutate(values, {
        onSuccess: (created) => {
          toast('Stack saved. Composition is now available.');
          router.replace(`/stacks/${created.id}`);
        },
        onError: (e) => toast(e.message, 'error'),
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
            : 'Start with the core details. You can add actions after the first save.'
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
    </>
  );
}
