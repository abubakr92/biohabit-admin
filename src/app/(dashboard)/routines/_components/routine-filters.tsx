import { Search } from 'lucide-react';
import type { AppUser } from '@/types/models';
import { labelFor, modes } from '@/lib/constants/enums';

export interface RoutineFiltersValue {
  search: string;
  source: string;
  status: string;
  mode: string;
  userId: string;
}

export function RoutineFilters({
  value,
  users,
  onChange,
}: {
  value: RoutineFiltersValue;
  users: AppUser[];
  onChange: (value: RoutineFiltersValue) => void;
}) {
  const set = (key: keyof RoutineFiltersValue, next: string) => onChange({ ...value, [key]: next });
  return (
    <div className="card mb-5 flex flex-col gap-3 p-4 xl:flex-row">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
        <input
          className="field pl-9"
          placeholder="Search routine or owner email…"
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>
      <select
        className="field xl:w-40"
        value={value.source}
        onChange={(e) => set('source', e.target.value)}
      >
        <option value="">Any source</option>
        <option value="template">From a template</option>
        <option value="custom">Custom</option>
      </select>
      <select
        className="field xl:w-36"
        value={value.status}
        onChange={(e) => set('status', e.target.value)}
      >
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="expired">Expired</option>
      </select>
      <select
        className="field xl:w-36"
        value={value.mode}
        onChange={(e) => set('mode', e.target.value)}
      >
        <option value="">Any mode</option>
        {modes.map((item) => (
          <option key={item} value={item}>
            {labelFor(item)}
          </option>
        ))}
      </select>
      <select
        className="field xl:w-52"
        value={value.userId}
        onChange={(e) => set('userId', e.target.value)}
      >
        <option value="">All users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.email}
          </option>
        ))}
      </select>
    </div>
  );
}
