'use client';
import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { MicroAction } from '@/types/models';
export function MicroActionPicker({
  open,
  actions,
  usedIds,
  onClose,
  onSelect,
}: {
  open: boolean;
  actions: MicroAction[];
  usedIds: string[];
  onClose: () => void;
  onSelect: (action: MicroAction) => void;
}) {
  const [search, setSearch] = useState('');
  const results = useMemo(
    () =>
      actions.filter((action) =>
        `${action.title.en} ${action.title.nl} ${action.labels.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [actions, search],
  );
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[75vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold">Add micro-action</h2>
            <p className="mt-1 text-sm text-slate-500">Choose an existing behavioural unit.</p>
          </div>
          <button onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <input
              autoFocus
              className="field pl-9"
              placeholder="Search title or label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.map((action) => {
            const used = usedIds.includes(action.id);
            return (
              <button
                key={action.id}
                disabled={used}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
                onClick={() => onSelect(action)}
              >
                <span>
                  <span className="block text-sm font-semibold">{action.title.en}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {action.durationMin} min · {action.labels.join(', ')}
                  </span>
                </span>
                {used ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                    <Check className="size-4" />
                    Added
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-[#236b5b]">Add</span>
                )}
              </button>
            );
          })}
          {!results.length && (
            <p className="p-8 text-center text-sm text-slate-500">No actions match that search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
