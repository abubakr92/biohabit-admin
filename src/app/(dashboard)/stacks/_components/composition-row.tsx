'use client';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ContextRow, Daypart, MicroAction } from '@/types/models';
import { labelFor } from '@/lib/constants/enums';
export function CompositionRow({
  row,
  position,
  stackDaypart,
  action,
  onEdit,
  onDelete,
}: {
  row: ContextRow;
  /** Effective order, 1-based: the row's place in stackSortOrder, which drag-and-drop owns. */
  position: number;
  stackDaypart: Daypart | null;
  action?: MicroAction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // The row's own function when set, otherwise the one inherited from the library action.
  const effectiveFunction = row.functionTag ?? action?.defaultFunctionTag ?? null;
  // Same rule for daypart, except the fallback is the stack rather than the library action.
  const effectiveDaypart = row.daypart ?? stackDaypart;
  const sortable = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const timing =
    row.timingType === 'none'
      ? 'Any time'
      : row.timingType === 'relative'
        ? 'Relative to earlier action'
        : row.timingType === 'window'
          ? `${row.startTime}–${row.endTime}`
          : `${labelFor(row.timingType)} · ${row.startTime}`;
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-slate-100 bg-white px-3 py-4 last:border-0 sm:grid-cols-[36px_28px_minmax(180px,1fr)_130px_150px_100px_80px_38px] ${sortable.isDragging ? 'relative z-10 rounded-xl shadow-xl' : ''}`}
    >
      <button
        className="flex size-8 touch-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
        aria-label="Drag to reorder"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <span
        className="hidden text-sm font-semibold tabular-nums text-slate-400 sm:block"
        title="Effective order, set by dragging"
      >
        {position}
      </span>
      <button className="text-left" onClick={onEdit}>
        <span className="block font-semibold text-slate-900">{row.microActionTitle.en}</span>
        <span className="mt-1 block text-xs text-slate-400">
          {row.microActionTitle.nl}
          {effectiveFunction ? ` · ${labelFor(effectiveFunction)}` : ''}
          {row.isOptional ? ' · Optional' : ''}
        </span>
      </button>
      <span className="hidden text-sm sm:block">
        {effectiveDaypart ? (
          <span className={row.daypart ? 'font-semibold text-slate-700' : 'text-slate-500'}>
            {labelFor(effectiveDaypart)}
          </span>
        ) : (
          <span className="text-slate-400">Not set</span>
        )}
        <span className="mt-0.5 block text-xs text-slate-400">
          {row.daypart ? 'Overrides stack' : 'Inherits stack'}
        </span>
      </span>
      <span className="hidden text-sm text-slate-500 sm:block">{timing}</span>
      <span
        className={`badge hidden justify-self-start sm:inline-flex ${row.includedInMode === 'essential' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.includedInMode === 'balanced' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}`}
      >
        From {labelFor(row.includedInMode)}
      </span>
      <span className="hidden text-right text-sm font-semibold tabular-nums sm:block">
        {row.durationOverrideMin ?? action?.durationMin ?? 0} min
      </span>
      <details className="relative justify-self-end">
        <summary className="flex size-8 list-none items-center justify-center rounded-md hover:bg-slate-100">
          <MoreHorizontal className="size-5" />
        </summary>
        <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          <button
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
            Edit
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Remove
          </button>
        </div>
      </details>
    </div>
  );
}
