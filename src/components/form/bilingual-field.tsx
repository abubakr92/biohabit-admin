import type { FieldError } from 'react-hook-form';
export function BilingualField({
  label,
  nl,
  en,
  multiline,
  errors,
}: {
  label: string;
  nl: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  en: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  multiline?: boolean;
  errors?: { nl?: FieldError; en?: FieldError };
}) {
  const Element = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-400">NL</span>
          <Element {...nl} className={multiline ? 'textarea' : 'field'} />
          {errors?.nl && <p className="mt-1 text-xs text-red-600">{errors.nl.message}</p>}
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-400">EN</span>
          <Element {...en} className={multiline ? 'textarea' : 'field'} />
          {errors?.en && <p className="mt-1 text-xs text-red-600">{errors.en.message}</p>}
        </div>
      </div>
    </div>
  );
}
