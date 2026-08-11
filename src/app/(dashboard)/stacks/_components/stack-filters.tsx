import { Search } from 'lucide-react';
import type { Label } from '@/types/models';
import { functionTags, labelFor } from '@/lib/constants/enums';
export interface StackFiltersValue {
  search: string;
  functionTag: string;
  daypart: string;
  label: string;
  active: string;
}
export function StackFilters({
  value,
  labels,
  onChange,
}: {
  value: StackFiltersValue;
  labels: Label[];
  onChange: (value: StackFiltersValue) => void;
}) {
  const set = (key: keyof StackFiltersValue, next: string) => onChange({ ...value, [key]: next });
  return (
    <div className="card mb-5 flex flex-col gap-3 p-4 xl:flex-row">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
        <input
          className="field pl-9"
          placeholder="Search stacks…"
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>
      <select
        className="field xl:w-40"
        value={value.functionTag}
        onChange={(e) => set('functionTag', e.target.value)}
      >
        <option value="">All functions</option>
        {functionTags.map((item) => (
          <option key={item} value={item}>
            {labelFor(item)}
          </option>
        ))}
      </select>
      <select
        className="field xl:w-40"
        value={value.daypart}
        onChange={(e) => set('daypart', e.target.value)}
      >
        <option value="">All dayparts</option>
        <option value="morning">Morning</option>
        <option value="midday">Midday</option>
        <option value="evening">Evening</option>
      </select>
      <select
        className="field xl:w-40"
        value={value.label}
        onChange={(e) => set('label', e.target.value)}
      >
        <option value="">All labels</option>
        {labels.map((item) => (
          <option key={item.id} value={item.key}>
            {item.name.en}
          </option>
        ))}
      </select>
      <select
        className="field xl:w-36"
        value={value.active}
        onChange={(e) => set('active', e.target.value)}
      >
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
