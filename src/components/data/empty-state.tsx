import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-xl bg-slate-100 p-3">
        <Inbox className="size-5 text-slate-500" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
