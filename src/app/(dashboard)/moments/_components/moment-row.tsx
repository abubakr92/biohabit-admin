'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Pencil, X } from 'lucide-react';
import type { Moment } from '@/types/models';
import { dayparts, labelFor } from '@/lib/constants/enums';
import { useUpdateMoment } from '@/lib/hooks/use-moments';
import { applyFieldErrors } from '@/lib/api/field-errors';
import { useToast } from '@/app/providers';

// Mirrors functions/src/schemas.ts: a moment is stored only once every value is present.
const schema = z.object({
  label: z.object({
    nl: z.string().trim().min(1, 'Required'),
    en: z.string().trim().min(1, 'Required'),
  }),
  daypart: z.enum(['morning', 'midday', 'evening'], { message: 'Choose a daypart.' }),
  defaultTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour HH:mm time.'),
});
type Values = z.infer<typeof schema>;

const missing = <span className="text-slate-400">Not set</span>;

export function MomentRow({ moment }: { moment: Moment }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateMoment();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: moment.label,
      daypart: moment.daypart ?? undefined,
      defaultTime: moment.defaultTime ?? '',
    },
  });
  const save = (values: Values) =>
    update.mutate(
      { key: moment.key, input: values },
      {
        onSuccess: () => {
          setEditing(false);
          toast(`${values.label.en} saved.`);
        },
        onError: (error) => {
          if (!applyFieldErrors(error, setError)) toast(error.message, 'error');
        },
      },
    );
  const error = (message?: string) =>
    message && <p className="mt-1 text-xs text-red-600">{message}</p>;
  return (
    <tr className="border-b border-slate-100 align-top last:border-0">
      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-400">
        {moment.sortOrder + 1}
      </td>
      <td className="px-5 py-4 font-mono text-sm text-slate-600">{moment.key}</td>
      {editing ? (
        <>
          <td className="px-5 py-3">
            <input className="field" {...register('label.en')} />
            {error(errors.label?.en?.message)}
          </td>
          <td className="px-5 py-3">
            <input className="field" {...register('label.nl')} />
            {error(errors.label?.nl?.message)}
          </td>
          <td className="px-5 py-3">
            <select className="field" {...register('daypart')}>
              <option value="">Choose…</option>
              {dayparts.map((item) => (
                <option key={item} value={item}>
                  {labelFor(item)}
                </option>
              ))}
            </select>
            {error(errors.daypart?.message)}
          </td>
          <td className="px-5 py-3">
            <input type="time" className="field" {...register('defaultTime')} />
            {error(errors.defaultTime?.message)}
          </td>
        </>
      ) : (
        <>
          <td className="px-5 py-4 text-sm font-semibold">{moment.label.en}</td>
          <td className="px-5 py-4 text-sm">{moment.label.nl || missing}</td>
          <td className="px-5 py-4 text-sm">
            {moment.daypart ? labelFor(moment.daypart) : missing}
          </td>
          <td className="px-5 py-4 text-sm tabular-nums">{moment.defaultTime ?? missing}</td>
        </>
      )}
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1">
          {editing ? (
            <>
              <button
                className="flex size-8 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50"
                aria-label="Save moment"
                disabled={update.isPending}
                onClick={handleSubmit(save)}
              >
                <Check className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
                aria-label="Cancel"
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
              {!moment.updatedAt && (
                <span className="badge mr-2 self-center border-amber-200 bg-amber-50 text-[11px] text-amber-800">
                  Not configured
                </span>
              )}
              <button
                className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
                aria-label={`Edit ${moment.label.en}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
