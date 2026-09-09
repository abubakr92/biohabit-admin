'use client';
import { useState } from 'react';
import { Bell, Pencil, Plus, Trash2 } from 'lucide-react';
import type { NotificationTemplate } from '@/types/models';
import type { SubmitHelpers } from '@/types/api';
import type { NotificationTemplateFormValues } from '@/lib/validation/notification-template';
import { applyFieldErrors } from '@/lib/api/field-errors';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { formatDate } from '@/lib/utils/format';
import {
  useCreateNotificationTemplate,
  useDeleteNotificationTemplate,
  useNotificationTemplates,
  useUpdateNotificationTemplate,
} from '@/lib/hooks/use-notification-templates';
import { useToast } from '@/app/providers';
import { TemplateForm } from './_components/template-form';

export default function NotificationTemplatesPage() {
  const query = useNotificationTemplates();
  const create = useCreateNotificationTemplate();
  const update = useUpdateNotificationTemplate();
  const remove = useDeleteNotificationTemplate();
  const toast = useToast();
  // 'new' opens the create form; a template id opens that row's editor. Only one is open at a time.
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<NotificationTemplate | null>(null);

  const onError =
    (setError: SubmitHelpers<NotificationTemplateFormValues>['setError']) => (error: Error) => {
      if (applyFieldErrors(error, setError))
        toast('Some fields need attention before this can be saved.', 'error');
      else toast(error.message, 'error');
    };

  const submit = (
    id: string | null,
    values: NotificationTemplateFormValues,
    { setError }: SubmitHelpers<NotificationTemplateFormValues>,
  ) => {
    const done = (message: string) => () => {
      setEditing(null);
      toast(message);
    };
    if (id)
      update.mutate(
        { id, input: values },
        { onSuccess: done('Notification template saved.'), onError: onError(setError) },
      );
    else
      create.mutate(values, {
        onSuccess: done('Notification template created.'),
        onError: onError(setError),
      });
  };

  const templates = query.data ?? [];
  const pending = create.isPending || update.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Notification templates"
        description="The copy the app sends, in NL and EN. Wording changes here go live without an app release."
      />
      {query.isLoading ? (
        <LoadingState rows={4} />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : (
        <div className="card overflow-hidden">
          {templates.length === 0 && editing !== 'new' ? (
            <div className="p-5">
              <EmptyState
                title="No notification templates yet"
                description="Build 1 defines one trigger, series_anchor. Add it here to make its copy editable."
              />
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="border-b border-slate-100 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Bell className="size-4 shrink-0 text-slate-400" />
                      <code className="font-mono text-sm font-semibold">{template.triggerKey}</code>
                      <span
                        className={`badge ${template.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}`}
                      >
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{template.title.en}</p>
                    <p className="text-sm text-slate-500">{template.body.en}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {template.title.nl} — {template.body.nl}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {template.deeplinkTarget ? `Opens ${template.deeplinkTarget}` : 'Opens Home'}{' '}
                      · updated {formatDate(template.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
                      aria-label={`Edit ${template.triggerKey}`}
                      onClick={() => setEditing(editing === template.id ? null : template.id)}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      className="flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${template.triggerKey}`}
                      onClick={() => setDeleting(template)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {editing === template.id && (
                  <TemplateForm
                    key={template.id}
                    template={template}
                    pending={pending}
                    onCancel={() => setEditing(null)}
                    onSubmit={(values, helpers) => submit(template.id, values, helpers)}
                  />
                )}
              </div>
            ))
          )}
          {editing === 'new' ? (
            <TemplateForm
              pending={pending}
              onCancel={() => setEditing(null)}
              onSubmit={(values, helpers) => submit(null, values, helpers)}
            />
          ) : (
            <button
              className="flex w-full items-center justify-center gap-2 border-t border-slate-200 py-4 text-sm font-semibold text-[#236b5b] hover:bg-slate-50"
              onClick={() => setEditing('new')}
            >
              <Plus className="size-4" />
              Add template
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this template?"
        description={`The app will fall back to whatever it ships for “${deleting?.triggerKey ?? ''}”. Deactivating instead keeps the copy editable.`}
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast('Notification template deleted.');
              setDeleting(null);
            },
            onError: (error) => {
              toast(error.message, 'error');
              setDeleting(null);
            },
          })
        }
      />
    </>
  );
}
