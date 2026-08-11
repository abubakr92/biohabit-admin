'use client';
import type { Label } from '@/types/models';
export function LabelMultiSelect({
  labels,
  value,
  onChange,
}: {
  labels: Label[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => {
        const active = value.includes(label.key);
        return (
          <button
            type="button"
            key={label.id}
            onClick={() =>
              onChange(active ? value.filter((item) => item !== label.key) : [...value, label.key])
            }
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${active ? 'border-[#236b5b] bg-[#eaf5f1] text-[#195548]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            {label.name.en}
          </button>
        );
      })}
    </div>
  );
}
