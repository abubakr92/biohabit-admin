'use client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import type { Label, MicroAction } from '@/types/models';
import type { SubmitHelpers } from '@/types/api';
import { microActionSchema, type MicroActionFormValues } from '@/lib/validation/micro-action';
import { BilingualField } from '@/components/form/bilingual-field';
import { FormSection } from '@/components/form/form-section';
import { FormErrorSummary } from '@/components/form/form-error-summary';
import { LabelMultiSelect } from '@/components/form/label-multi-select';
import { functionTags, labelFor, levels } from '@/lib/constants/enums';
const empty: MicroActionFormValues = {
  title: { nl: '', en: '' },
  effect: { nl: '', en: '' },
  howTo: { nl: '', en: '' },
  warning: { nl: '', en: '' },
  labels: [],
  durationMin: 3,
  level: 'beginner',
  defaultFunctionTag: null,
};
export function MicroActionForm({
  action,
  labels,
  pending,
  onSubmit,
}: {
  action?: MicroAction;
  labels: Label[];
  pending?: boolean;
  onSubmit: (values: MicroActionFormValues, helpers: SubmitHelpers<MicroActionFormValues>) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MicroActionFormValues>({
    resolver: zodResolver(microActionSchema),
    defaultValues: action
      ? {
          title: action.title,
          effect: action.effect,
          howTo: action.howTo,
          warning: action.warning,
          labels: action.labels,
          durationMin: action.durationMin,
          level: action.level,
          defaultFunctionTag: action.defaultFunctionTag ?? null,
        }
      : empty,
  });
  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, { setError }))}>
      <div className="card px-6 sm:px-8">
        <FormSection
          title="Action copy"
          description="NL and EN are always maintained on the same record."
        >
          <div className="space-y-6">
            <BilingualField
              label="Title"
              nl={register('title.nl')}
              en={register('title.en')}
              errors={errors.title}
            />
            <BilingualField
              label="Effect"
              multiline
              nl={register('effect.nl')}
              en={register('effect.en')}
              errors={errors.effect}
            />
            <BilingualField
              label="How-to"
              multiline
              nl={register('howTo.nl')}
              en={register('howTo.en')}
              errors={errors.howTo}
            />
            <div>
              <BilingualField
                label="Warning (optional)"
                multiline
                nl={register('warning.nl')}
                en={register('warning.en')}
                errors={errors.warning}
              />
              {/* Left empty on purpose where an action needs no caveat: the app omits its warning
                  block when there is no text, so filler would put a warning where none belongs. */}
              <p className="mt-1.5 text-xs text-slate-500">
                Leave both blank when the action needs no caveat — the app then shows no warning at
                all.
              </p>
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Defaults"
          description="A stack context may override duration and timing later."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Duration (minutes)
              <input
                type="number"
                className="field mt-2"
                min="1"
                max="60"
                {...register('durationMin', { valueAsNumber: true })}
              />
              {errors.durationMin && (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.durationMin.message}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold">
              Level
              <select className="field mt-2" {...register('level')}>
                {levels.map((item) => (
                  <option key={item} value={item}>
                    {labelFor(item)}
                  </option>
                ))}
              </select>
              {errors.level && (
                <span className="mt-1 block text-xs text-red-600">{errors.level.message}</span>
              )}
            </label>
            <label className="text-sm font-semibold">
              Default function
              <select
                className="field mt-2"
                {...register('defaultFunctionTag', { setValueAs: (value) => value || null })}
              >
                <option value="">Not set</option>
                {functionTags.map((item) => (
                  <option key={item} value={item}>
                    {labelFor(item)}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Inherited by every context row unless that row overrides it.
              </span>
            </label>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold">Labels</p>
              <Controller
                name="labels"
                control={control}
                render={({ field }) => (
                  <LabelMultiSelect labels={labels} value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.labels && (
                <p className="mt-2 text-xs text-red-600">{errors.labels.message}</p>
              )}
            </div>
          </div>
        </FormSection>
      </div>
      <FormErrorSummary errors={errors} />
      <div className="mt-5 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          <Save className="size-4" />
          {pending ? 'Saving…' : action ? 'Save changes' : 'Create micro-action'}
        </button>
      </div>
    </form>
  );
}
