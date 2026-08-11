'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { Label } from '@/types/models';
import { useUpdateLabel } from '@/lib/hooks/use-labels';
import { useToast } from '@/app/providers';
const schema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only.'),
  name: z.object({ nl: z.string().min(1, 'Required'), en: z.string().min(1, 'Required') }),
});
type Values = z.infer<typeof schema>;
export function LabelRow({ label, onDelete }: { label: Label; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateLabel();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { key: label.key, name: label.name },
  });
  const save = (values: Values) =>
    update.mutate(
      { id: label.id, input: values },
      {
        onSuccess: () => {
          setEditing(false);
          toast('Label updated.');
        },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {editing ? (
        <>
          <td className="px-5 py-3">
            <input className="field" {...register('key')} />
            {errors.key && <p className="mt-1 text-xs text-red-600">{errors.key.message}</p>}
          </td>
          <td className="px-5 py-3">
            <input className="field" {...register('name.nl')} />
            {errors.name?.nl && (
              <p className="mt-1 text-xs text-red-600">{errors.name.nl.message}</p>
            )}
          </td>
          <td className="px-5 py-3">
            <input className="field" {...register('name.en')} />
            {errors.name?.en && (
              <p className="mt-1 text-xs text-red-600">{errors.name.en.message}</p>
            )}
          </td>
        </>
      ) : (
        <>
          <td className="px-5 py-4 font-mono text-sm text-slate-600">{label.key}</td>
          <td className="px-5 py-4 text-sm">{label.name.nl}</td>
          <td className="px-5 py-4 text-sm font-semibold">{label.name.en}</td>
        </>
      )}
      <td className="px-5 py-4 text-sm text-slate-500">{label.usageCount} uses</td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1">
          {editing ? (
            <>
              <button
                className="flex size-8 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50"
                onClick={handleSubmit(save)}
              >
                <Check className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
                onClick={() => {
                  reset();
                  setEditing(false);
                }}
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button
                className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
