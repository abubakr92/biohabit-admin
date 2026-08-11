'use client';
import Link from 'next/link';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { MicroAction } from '@/types/models';
import { DataTable, type Column } from '@/components/data/data-table';
import { labelFor } from '@/lib/constants/enums';
export function MicroActionTable({
  data,
  onDelete,
}: {
  data: MicroAction[];
  onDelete: (action: MicroAction) => void;
}) {
  const columns: Column<MicroAction>[] = [
    {
      key: 'title',
      header: 'Title (EN)',
      render: (action) => (
        <Link href={`/micro-actions/${action.id}`} className="font-semibold hover:text-[#236b5b]">
          {action.title.en}
          <span className="mt-1 block text-xs font-normal text-slate-400">{action.title.nl}</span>
        </Link>
      ),
    },
    {
      key: 'labels',
      header: 'Labels',
      render: (action) => (
        <div className="flex flex-wrap gap-1">
          {action.labels.map((label) => (
            <span key={label} className="badge">
              {labelFor(label)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (action) => (
        <span className="font-medium tabular-nums">{action.durationMin} min</span>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (action) => <span className="text-slate-600">{labelFor(action.level)}</span>,
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (action) => (
        <span className={action.usedInStacksCount ? 'font-medium' : 'text-slate-400'}>
          Used in {action.usedInStacksCount} {action.usedInStacksCount === 1 ? 'stack' : 'stacks'}
        </span>
      ),
    },
    {
      key: 'menu',
      header: '',
      className: 'w-12',
      render: (action) => (
        <details className="relative">
          <summary className="flex size-8 list-none items-center justify-center rounded-lg hover:bg-slate-100">
            <MoreHorizontal className="size-5" />
          </summary>
          <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
            <Link
              href={`/micro-actions/${action.id}`}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Pencil className="size-4" />
              Edit
            </Link>
            <button
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => onDelete(action)}
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>
        </details>
      ),
    },
  ];
  return <DataTable data={data} columns={columns} />;
}
