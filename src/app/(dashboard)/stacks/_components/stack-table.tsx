'use client';
import Link from 'next/link';
import { Copy, MoreHorizontal, Pencil, Power } from 'lucide-react';
import type { Stack } from '@/types/models';
import { DataTable, type Column } from '@/components/data/data-table';
import { labelFor } from '@/lib/constants/enums';
import { useDuplicateStack, useUpdateStack } from '@/lib/hooks/use-stacks';
import { useToast } from '@/app/providers';
function StatusToggle({ stack }: { stack: Stack }) {
  const update = useUpdateStack(stack.id);
  const toast = useToast();
  return (
    <button
      aria-label={`Set ${stack.title.en} ${stack.isActive ? 'inactive' : 'active'}`}
      className={`relative h-6 w-11 rounded-full transition ${stack.isActive ? 'bg-[#236b5b]' : 'bg-slate-300'}`}
      onClick={() =>
        update.mutate(
          { isActive: !stack.isActive },
          {
            onSuccess: () =>
              toast(`${stack.title.en} is now ${stack.isActive ? 'inactive' : 'active'}.`),
            onError: (e) => toast(e.message, 'error'),
          },
        )
      }
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${stack.isActive ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}
function RowActions({ stack }: { stack: Stack }) {
  const duplicate = useDuplicateStack();
  const update = useUpdateStack(stack.id);
  const toast = useToast();
  return (
    <details className="relative">
      <summary className="flex size-8 list-none items-center justify-center rounded-lg hover:bg-slate-100">
        <MoreHorizontal className="size-5" />
      </summary>
      <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
        <Link
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"
          href={`/stacks/${stack.id}`}
        >
          <Pencil className="size-4" />
          Edit
        </Link>
        <button
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"
          onClick={() =>
            duplicate.mutate(stack.id, {
              onSuccess: () => toast('Stack duplicated as an inactive draft.'),
              onError: (e) => toast(e.message, 'error'),
            })
          }
        >
          <Copy className="size-4" />
          Duplicate
        </button>
        {stack.isActive && (
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() =>
              update.mutate(
                { isActive: false },
                {
                  onSuccess: () => toast('Stack deactivated.'),
                  onError: (e) => toast(e.message, 'error'),
                },
              )
            }
          >
            <Power className="size-4" />
            Deactivate
          </button>
        )}
      </div>
    </details>
  );
}
export function StackTable({ data }: { data: Stack[] }) {
  const columns: Column<Stack>[] = [
    {
      key: 'title',
      header: 'Title (EN)',
      render: (stack) => (
        <Link
          href={`/stacks/${stack.id}`}
          className="font-semibold text-slate-900 hover:text-[#236b5b]"
        >
          {stack.title.en}
          <span className="mt-1 block text-xs font-normal text-slate-400">{stack.title.nl}</span>
        </Link>
      ),
    },
    {
      key: 'function',
      header: 'Function',
      render: (stack) => <span className="badge">{labelFor(stack.functionTag)}</span>,
    },
    {
      key: 'label',
      header: 'Primary label',
      render: (stack) => <span className="text-slate-600">{labelFor(stack.primaryLabel)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (stack) => <span className="tabular-nums">{stack.actionCount}</span>,
    },
    {
      key: 'duration',
      header: 'Duration E / B / F',
      render: (stack) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {stack.modeDurations.essential} / {stack.modeDurations.balanced} /{' '}
          {stack.modeDurations.full} <span className="font-normal text-slate-400">min</span>
        </span>
      ),
    },
    { key: 'active', header: 'Active', render: (stack) => <StatusToggle stack={stack} /> },
    { key: 'menu', header: '', className: 'w-12', render: (stack) => <RowActions stack={stack} /> },
  ];
  return <DataTable data={data} columns={columns} />;
}
