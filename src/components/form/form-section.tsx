import type { ReactNode } from 'react';
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-slate-200 py-7 last:border-0 md:grid-cols-[220px_1fr]">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
