'use client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import type { NotificationTemplate } from '@/types/models';
import type { SubmitHelpers } from '@/types/api';
import {
  notificationTemplateSchema,
  type NotificationTemplateFormValues,
} from '@/lib/validation/notification-template';
import { BilingualField } from '@/components/form/bilingual-field';

const empty: NotificationTemplateFormValues = {
  // Build 1 defines exactly one trigger. Pre-filling it saves retyping without closing the field.
  triggerKey: 'series_anchor',
  title: { nl: '', en: '' },
  body: { nl: '', en: '' },
  deeplinkTarget: '',
  isActive: true,
};

export function TemplateForm({
  template,
  pending,
  onSubmit,
  onCancel,
}: {
  template?: NotificationTemplate;
  pending?: boolean;
  onSubmit: (
    values: NotificationTemplateFormValues,
    helpers: SubmitHelpers<NotificationTemplateFormValues>,
  ) => void;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NotificationTemplateFormValues>({
    resolver: zodResolver(notificationTemplateSchema),
    defaultValues: template
      ? {
          triggerKey: template.triggerKey,
          title: template.title,
          body: template.body,
          deeplinkTarget: template.deeplinkTarget ?? '',
          isActive: template.isActive,
        }
      : empty,
  });
  return (
    <form
      className="space-y-6 border-t border-slate-200 bg-slate-50/70 p-5"
      onSubmit={handleSubmit((values) => onSubmit(values, { setError }))}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Trigger key
          {/* readOnly, not disabled: a disabled input can drop out of the submitted values, which
              is the same class of bug that was silently clearing the primary label. */}
          <input
            className={`field mt-2 font-mono ${template ? 'bg-slate-100 text-slate-500' : ''}`}
            readOnly={Boolean(template)}
            {...register('triggerKey')}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {template
              ? 'The app looks this template up by its key, so the key cannot change. Delete and recreate to rename it.'
              : 'Build 1 defines series_anchor. One template per trigger.'}
          </span>
          {errors.triggerKey && (
            <span className="mt-1 block text-xs text-red-600">{errors.triggerKey.message}</span>
          )}
        </label>
        <label className="text-sm font-semibold">
          Deeplink target
          <input
            className="field mt-2 font-mono"
            placeholder="Leave empty to open Home"
            {...register('deeplinkTarget')}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Where tapping the notification lands in the app.
          </span>
          {errors.deeplinkTarget && (
            <span className="mt-1 block text-xs text-red-600">{errors.deeplinkTarget.message}</span>
          )}
        </label>
      </div>
      <BilingualField
        label="Title"
        nl={register('title.nl')}
        en={register('title.en')}
        errors={errors.title}
      />
      <BilingualField
        label="Body"
        multiline
        nl={register('body.nl')}
        en={register('body.en')}
        errors={errors.body}
      />
      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <label className="flex items-start justify-between gap-6 rounded-xl border border-slate-200 bg-white p-4">
            <span>
              <span className="block text-sm font-semibold">Active</span>
              <span className="mt-1 block text-sm text-slate-500">
                Inactive templates stay editable here and are not sent.
              </span>
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
      <div className="flex justify-end gap-3">
        <button type="button" className="btn" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </button>
        <button className="btn btn-primary" disabled={pending}>
          <Save className="size-4" />
          {pending ? 'Saving…' : template ? 'Save template' : 'Create template'}
        </button>
      </div>
    </form>
  );
}
