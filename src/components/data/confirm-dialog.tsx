'use client';
import { AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  pending,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onMouseDown={(e) => e.currentTarget === e.target && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <div
            className={`rounded-xl p-2 ${danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            {children}
          </div>
          <button onClick={onClose}>
            <X className="size-5 text-slate-400" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
