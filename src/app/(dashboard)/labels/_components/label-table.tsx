'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import type { Label } from '@/types/models';
import { useCreateLabel } from '@/lib/hooks/use-labels';
import { useToast } from '@/app/providers';
import { LabelRow } from './label-row';
const schema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters and hyphens.'),
  nameNl: z.string().min(1),
  nameEn: z.string().min(1),
});
type Values = z.infer<typeof schema>;
export function LabelTable({
  labels,
  onDelete,
}: {
  labels: Label[];
  onDelete: (label: Label) => void;
}) {
  const [adding, setAdding] = useState(false);
  const create = useCreateLabel();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { key: '', nameNl: '', nameEn: '' },
  });
  const submit = (values: Values) =>
    create.mutate(
      { key: values.key, name: { nl: values.nameNl, en: values.nameEn } },
      {
        onSuccess: () => {
          reset();
          setAdding(false);
          toast('Label created.');
        },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>
            {['Key', 'Name NL', 'Name EN', 'Usage', ''].map((item) => (
              <th
                key={item}
                className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <LabelRow key={label.id} label={label} onDelete={() => onDelete(label)} />
          ))}
        </tbody>
      </table>
      {adding ? (
        <form
          className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 border-t border-slate-200 bg-slate-50 p-4"
          onSubmit={handleSubmit(submit)}
        >
          <input className="field" placeholder="key" {...register('key')} />
          <input className="field" placeholder="Naam NL" {...register('nameNl')} />
          <input className="field" placeholder="Name EN" {...register('nameEn')} />
          <div className="flex gap-2">
            <button className="btn btn-primary">Save</button>
            <button type="button" className="btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex w-full items-center justify-center gap-2 border-t border-slate-200 py-4 text-sm font-semibold text-[#236b5b] hover:bg-slate-50"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          Add label
        </button>
      )}
    </div>
  );
}
