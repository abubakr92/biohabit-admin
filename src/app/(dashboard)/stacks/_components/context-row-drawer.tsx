'use client';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Trash2, X } from 'lucide-react';
import type { ContextRow } from '@/types/models';
import { contextRowSchema, type ContextRowFormValues } from '@/lib/validation/context-row';
import { derivedModes } from '@/lib/utils/modes';
import { dayparts, labelFor, modes, timingTypes } from '@/lib/constants/enums';
import { BilingualField } from '@/components/form/bilingual-field';
import { TimingTypeFields } from '@/components/form/timing-type-fields';
export function ContextRowDrawer({
  row,
  rows,
  open,
  pending,
  onClose,
  onSave,
  onDelete,
}: {
  row: ContextRow | null;
  rows: ContextRow[];
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onSave: (values: ContextRowFormValues) => void;
  onDelete: () => void;
}) {
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ContextRowFormValues>({ resolver: zodResolver(contextRowSchema) });
  useEffect(() => {
    if (row) reset({ ...row });
  }, [row, reset]);
  if (!open || !row) return null;
  const timingType = watch('timingType');
  const included = watch('includedInMode');
  const dependency = watch('dependencyText') ?? { nl: '', en: '' };
  const earlierRows = rows.filter((item) => item.stackSortOrder < row.stackSortOrder);
  const changeTiming = (value: ContextRowFormValues['timingType']) => {
    setValue('timingType', value);
    setValue('startTime', null);
    setValue('endTime', null);
    setValue('relativeToContextId', null);
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/25"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[620px] flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#236b5b]">
              Context row
            </p>
            <h2 className="mt-1 text-xl font-semibold">{row.microActionTitle.en}</h2>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-lg hover:bg-slate-100"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(onSave)}>
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
            <section>
              <h3 className="mb-4 text-sm font-bold">Mode & order</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Included from
                  <select className="field mt-2" {...register('includedInMode')}>
                    {modes.map((item) => (
                      <option key={item} value={item}>
                        {labelFor(item)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Appears in:{' '}
                    {derivedModes(included ?? row.includedInMode)
                      .map(labelFor)
                      .join(', ')}
                  </span>
                </label>
                <label className="text-sm font-semibold">
                  Order within mode
                  <input
                    type="number"
                    className="field mt-2"
                    {...register('priorityOrder', { valueAsNumber: true })}
                  />
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Controls ordering, never depth.
                  </span>
                </label>
              </div>
            </section>
            <section className="border-t border-slate-200 pt-6">
              <h3 className="mb-4 text-sm font-bold">Placement & duration</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Daypart
                  <select className="field mt-2" {...register('daypart')}>
                    {dayparts.map((item) => (
                      <option key={item} value={item}>
                        {labelFor(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <Controller
                  name="durationOverrideMin"
                  control={control}
                  render={({ field }) => (
                    <label className="text-sm font-semibold">
                      Duration override (min)
                      <input
                        type="number"
                        min="1"
                        className="field mt-2"
                        value={field.value ?? ''}
                        placeholder="Use action default"
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </label>
                  )}
                />
                <Controller
                  name="isOptional"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium">
                      <input type="checkbox" checked={field.value} onChange={field.onChange} />
                      Optional
                    </label>
                  )}
                />
                <Controller
                  name="isActiveByDefault"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium">
                      <input type="checkbox" checked={field.value} onChange={field.onChange} />
                      Active by default
                    </label>
                  )}
                />
              </div>
            </section>
            <section className="border-t border-slate-200 pt-6">
              <h3 className="mb-4 text-sm font-bold">Timing</h3>
              <label className="text-sm font-semibold">
                Timing type
                <select
                  className="field mt-2"
                  value={timingType ?? row.timingType}
                  onChange={(e) =>
                    changeTiming(e.target.value as ContextRowFormValues['timingType'])
                  }
                >
                  {timingTypes.map((item) => (
                    <option key={item} value={item}>
                      {labelFor(item)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4">
                <TimingTypeFields
                  type={timingType ?? row.timingType}
                  startTime={watch('startTime')}
                  endTime={watch('endTime')}
                  relativeId={watch('relativeToContextId')}
                  dependency={dependency}
                  earlierRows={earlierRows}
                  onChange={(field, value) =>
                    setValue(field as keyof ContextRowFormValues, value as never)
                  }
                />
              </div>
              {(errors.startTime ||
                errors.endTime ||
                errors.relativeToContextId ||
                errors.dependencyText) && (
                <p className="mt-3 text-sm text-red-600">
                  {errors.startTime?.message ??
                    errors.endTime?.message ??
                    errors.relativeToContextId?.message ??
                    errors.dependencyText?.message}
                </p>
              )}
            </section>
            <section className="space-y-5 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-bold">Context copy</h3>
              <BilingualField
                label="Context effect"
                multiline
                nl={register('contextEffect.nl')}
                en={register('contextEffect.en')}
              />
              <BilingualField
                label="Context warning"
                multiline
                nl={register('contextWarning.nl')}
                en={register('contextWarning.en')}
              />
            </section>
            <details className="border-t border-slate-200 pt-6">
              <summary className="text-sm font-bold">
                Kairos fields <span className="font-normal text-slate-400">· later release</span>
              </summary>
              <p className="mt-2 text-sm text-slate-500">
                Stored for a later release, not shown in the app.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Centre time
                  <input type="time" className="field mt-2" {...register('centreTime')} />
                </label>
                <Controller
                  name="elasticityMin"
                  control={control}
                  render={({ field }) => (
                    <label className="text-sm font-semibold">
                      Elasticity (min)
                      <input
                        type="number"
                        className="field mt-2"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </label>
                  )}
                />
              </div>
            </details>
          </div>
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              <Trash2 className="size-4" />
              Remove
            </button>
            <div className="flex gap-3">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={pending}>
                <Save className="size-4" />
                {pending ? 'Saving…' : 'Save row'}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
