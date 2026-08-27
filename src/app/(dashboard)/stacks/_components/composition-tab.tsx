'use client';
import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { MicroAction, Mode, Stack } from '@/types/models';
import type { SubmitHelpers } from '@/types/api';
import { applyFieldErrors } from '@/lib/api/field-errors';
import {
  useContextRows,
  useCreateContextRow,
  useDeleteContextRow,
  useReorderContextRows,
  useUpdateContextRow,
} from '@/lib/hooks/use-context-rows';
import { useMicroActions } from '@/lib/hooks/use-micro-actions';
import { appearsInMode, durationForMode } from '@/lib/utils/modes';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { useToast } from '@/app/providers';
import type { ContextRowFormValues } from '@/lib/validation/context-row';
import { ModePreviewBar } from './mode-preview-bar';
import { CompositionRow } from './composition-row';
import { MicroActionPicker } from './micro-action-picker';
import { ContextRowDrawer } from './context-row-drawer';
export function CompositionTab({ stack }: { stack: Stack }) {
  const rowsQuery = useContextRows(stack.id);
  const actionsQuery = useMicroActions();
  const create = useCreateContextRow(stack.id);
  const update = useUpdateContextRow(stack.id);
  const remove = useDeleteContextRow(stack.id);
  const reorder = useReorderContextRows(stack.id);
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('essential');
  const [picker, setPicker] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);
  const actions = actionsQuery.data ?? [];
  const visible = useMemo(
    () => rows.filter((row) => appearsInMode(row.includedInMode, mode)),
    [rows, mode],
  );
  const duration = durationForMode(rows, actions, mode);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const addAction = (action: MicroAction) => {
    const input = {
      microActionId: action.id,
      microActionTitle: action.title,
      functionTag: null,
      stackSortOrder: rows.length,
      priorityOrder: rows.length + 1,
      isOptional: false,
      isActiveByDefault: true,
      includedInMode: mode,
      daypart: 'morning' as const,
      durationOverrideMin: null,
      timingType: 'none' as const,
      startTime: null,
      endTime: null,
      relativeToContextId: null,
      dependencyText: { nl: '', en: '' },
      contextEffect: { nl: action.effect.nl, en: action.effect.en },
      contextWarning: { nl: action.warning.nl, en: action.warning.en },
      centreTime: null,
      elasticityMin: null,
    };
    create.mutate(input, {
      onSuccess: (row) => {
        setPicker(false);
        setSelectedId(row.id);
        toast(`${action.title.en} added.`);
      },
      onError: (e) => toast(e.message, 'error'),
    });
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((row) => row.id === active.id);
    const newIndex = rows.findIndex((row) => row.id === over.id);
    const next = arrayMove(rows, oldIndex, newIndex);
    reorder.mutate(
      next.map((row) => row.id),
      { onSuccess: () => toast('Order updated.'), onError: (e) => toast(e.message, 'error') },
    );
  };
  const save = (
    values: ContextRowFormValues,
    { setError }: SubmitHelpers<ContextRowFormValues>,
  ) => {
    if (!selected) return;
    // stackSortOrder is owned by drag-and-drop; sending the value this form loaded would
    // silently undo any reorder made while the drawer was open.
    const input: Partial<ContextRowFormValues> = { ...values };
    delete input.stackSortOrder;
    update.mutate(
      { id: selected.id, input },
      {
        onSuccess: () => {
          setSelectedId(null);
          toast('Context row saved.');
        },
        onError: (error) => {
          if (applyFieldErrors(error, setError))
            toast('Some fields need attention before this can be saved.', 'error');
          else toast(error.message, 'error');
        },
      },
    );
  };
  const confirmDelete = () => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        setSelectedId(null);
        toast('Micro-action removed from this stack.');
      },
      onError: (e) => toast(e.message, 'error'),
    });
  };
  if (rowsQuery.isLoading || actionsQuery.isLoading) return <LoadingState rows={6} />;
  if (rowsQuery.isError || actionsQuery.isError)
    return (
      <ErrorState
        message={rowsQuery.error?.message ?? actionsQuery.error?.message}
        retry={() => {
          rowsQuery.refetch();
          actionsQuery.refetch();
        }}
      />
    );
  return (
    <>
      <ModePreviewBar mode={mode} duration={duration} onChange={setMode} />
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold">{visible.length} actions in this preview</h2>
            <p className="mt-1 text-xs text-slate-500">
              Drag rows to update the stack order. Membership is cumulative.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setPicker(true)}>
            <Plus className="size-4" />
            Add micro-action
          </button>
        </div>
        {visible.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
            <SortableContext
              items={visible.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {visible.map((row) => (
                  <CompositionRow
                    key={row.id}
                    row={row}
                    action={actions.find((action) => action.id === row.microActionId)}
                    onEdit={() => setSelectedId(row.id)}
                    onDelete={() => setDeleteId(row.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="p-5">
            <EmptyState
              title={`No ${mode} actions`}
              description="Add a micro-action or switch modes to inspect the rest of the composition."
            />
          </div>
        )}
      </div>
      <MicroActionPicker
        open={picker}
        actions={actions}
        usedIds={rows.map((row) => row.microActionId)}
        onClose={() => setPicker(false)}
        onSelect={addAction}
      />
      <ContextRowDrawer
        key={selected?.id ?? 'closed'}
        inheritedFunction={
          actions.find((action) => action.id === selected?.microActionId)?.defaultFunctionTag ??
          null
        }
        open={Boolean(selected)}
        row={selected}
        rows={rows}
        pending={update.isPending}
        onClose={() => setSelectedId(null)}
        onSave={save}
        onDelete={() => selected && setDeleteId(selected.id)}
      />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Remove this action?"
        description="This only removes the context row from this stack. The reusable micro-action stays available."
        confirmLabel="Remove action"
        danger
        pending={remove.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
