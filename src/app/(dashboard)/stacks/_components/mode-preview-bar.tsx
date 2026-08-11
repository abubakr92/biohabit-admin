import { AlertTriangle, Clock3 } from 'lucide-react';
import type { Mode } from '@/types/models';
import { modes, labelFor } from '@/lib/constants/enums';
import { MODE_CAPS } from '@/lib/constants/rules';
export function ModePreviewBar({
  mode,
  duration,
  onChange,
}: {
  mode: Mode;
  duration: number;
  onChange: (mode: Mode) => void;
}) {
  const exceeded = duration > MODE_CAPS[mode];
  return (
    <div className="card mb-5 flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
          Preview what the member gets
        </p>
        <div className="mt-2 inline-flex rounded-lg bg-slate-100 p-1">
          {modes.map((item) => (
            <button
              key={item}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => onChange(item)}
            >
              {labelFor(item)}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${exceeded ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50'}`}
      >
        {exceeded ? (
          <AlertTriangle className="size-5 text-amber-600" />
        ) : (
          <Clock3 className="size-5 text-[#236b5b]" />
        )}
        <div>
          <p className="text-sm font-bold tabular-nums">
            {duration} min{' '}
            <span className="font-normal text-slate-500">/ {MODE_CAPS[mode]} min cap</span>
          </p>
          <p className="text-xs">
            {exceeded
              ? `Warning: ${labelFor(mode)} is ${duration - MODE_CAPS[mode]} min over its cap.`
              : `${MODE_CAPS[mode] - duration} min remaining`}
          </p>
        </div>
      </div>
    </div>
  );
}
