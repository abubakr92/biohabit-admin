'use client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { BilingualField } from '@/components/form/bilingual-field';
import { FormSection } from '@/components/form/form-section';
import { LabelMultiSelect } from '@/components/form/label-multi-select';
import { functionTags, labelFor, levels } from '@/lib/constants/enums';
import { missingForPublish, stackSchema, type StackFormValues } from '@/lib/validation/stack';
import type { SubmitHelpers } from '@/types/api';
import type { Label, Stack } from '@/types/models';
const empty: StackFormValues = {
  title: { nl: '', en: '' },
  description: { nl: '', en: '' },
  coherence: { nl: '', en: '' },
  suggestedTiming: { nl: '', en: '' },
  functionTag: 'regulate',
  primaryLabel: '',
  supportingLabels: [],
  level: 'beginner',
  isPremium: false,
  isActive: false,
};
export function StackDetailsForm({
  stack,
  labels,
  pending,
  onSubmit,
  onBlockedActive,
}: {
  stack?: Stack;
  labels: Label[];
  pending?: boolean;
  onSubmit: (values: StackFormValues, helpers: SubmitHelpers<StackFormValues>) => void;
  onBlockedActive: (message: string) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<StackFormValues>({
    resolver: zodResolver(stackSchema),
    defaultValues: stack
      ? {
          title: stack.title,
          description: stack.description,
          coherence: stack.coherence,
          suggestedTiming: stack.suggestedTiming,
          functionTag: stack.functionTag,
          primaryLabel: stack.primaryLabel,
          supportingLabels: stack.supportingLabels,
          level: stack.level,
          isPremium: stack.isPremium,
          isActive: stack.isActive,
        }
      : empty,
  });
  const activate = (next: boolean, change: (value: boolean) => void) => {
    if (!next) return change(false);
    const missing = missingForPublish(getValues());
    if (missing.length)
      return onBlockedActive(`Complete these fields before activating: ${missing.join(', ')}.`);
    change(true);
  };
  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, { setError }))}>
      <div className="card px-6 sm:px-8">
        <FormSection
          title="Identity"
          description="Translations are edited together so the record stays aligned."
        >
          <div className="space-y-6">
            <BilingualField
              label="Title"
              nl={register('title.nl')}
              en={register('title.en')}
              errors={errors.title}
            />
            <BilingualField
              label="Short description"
              multiline
              nl={register('description.nl')}
              en={register('description.en')}
              errors={errors.description}
            />
            <BilingualField
              label="Coherence sentence"
              multiline
              nl={register('coherence.nl')}
              en={register('coherence.en')}
              errors={errors.coherence}
            />
            <BilingualField
              label="Suggested timing"
              nl={register('suggestedTiming.nl')}
              en={register('suggestedTiming.en')}
              errors={errors.suggestedTiming}
            />
          </div>
        </FormSection>
        <FormSection
          title="Classification"
          description="Function is a single required value. Labels support discovery and grouping."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Function
              <select className="field mt-2" {...register('functionTag')}>
                {functionTags.map((item) => (
                  <option key={item} value={item}>
                    {labelFor(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Primary label
              <select className="field mt-2" {...register('primaryLabel')}>
                <option value="">Choose a label</option>
                {labels.map((item) => (
                  <option key={item.id} value={item.key}>
                    {item.name.en}
                  </option>
                ))}
              </select>
              {errors.primaryLabel && (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.primaryLabel.message}
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
            </label>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold">Supporting labels</p>
              <Controller
                name="supportingLabels"
                control={control}
                render={({ field }) => (
                  <LabelMultiSelect
                    labels={labels.filter((item) => item.key !== getValues('primaryLabel'))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Publishing"
          description="Draft content stays available here without appearing in the app."
        >
          <div className="space-y-4">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="flex items-start justify-between gap-6 rounded-xl border border-slate-200 p-4">
                    <span>
                      <span className="block text-sm font-semibold">Active</span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Publish this stack to the mobile app.
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      className={`relative mt-1 h-6 w-11 rounded-full ${field.value ? 'bg-[#236b5b]' : 'bg-slate-300'}`}
                      onClick={() => activate(!field.value, field.onChange)}
                    >
                      <span
                        className={`absolute top-1 size-4 rounded-full bg-white transition ${field.value ? 'left-6' : 'left-1'}`}
                      />
                    </button>
                  </label>
                  {errors.isActive && (
                    <p className="mt-2 text-sm text-red-600">{errors.isActive.message}</p>
                  )}
                </div>
              )}
            />
            <Controller
              name="isPremium"
              control={control}
              render={({ field }) => (
                <label className="flex items-start justify-between gap-6 rounded-xl border border-slate-200 p-4">
                  <span>
                    <span className="block text-sm font-semibold">Premium</span>
                    <span className="mt-1 block text-sm text-slate-500">No effect in Build 1.</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    className={`relative mt-1 h-6 w-11 rounded-full ${field.value ? 'bg-[#236b5b]' : 'bg-slate-300'}`}
                    onClick={() => field.onChange(!field.value)}
                  >
                    <span
                      className={`absolute top-1 size-4 rounded-full bg-white transition ${field.value ? 'left-6' : 'left-1'}`}
                    />
                  </button>
                </label>
              )}
            />
          </div>
        </FormSection>
      </div>
      <div className="sticky bottom-0 mt-5 flex justify-end border-t border-slate-200 bg-[#f6f7f8]/95 py-4 backdrop-blur">
        <button className="btn btn-primary" disabled={pending}>
          <Save className="size-4" />
          {pending ? 'Saving…' : stack ? 'Save changes' : 'Save stack'}
        </button>
      </div>
    </form>
  );
}
