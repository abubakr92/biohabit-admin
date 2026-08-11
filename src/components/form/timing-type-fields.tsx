import type { ContextRow, TimingType } from '@/types/models';
import { BilingualField } from './bilingual-field';
import { TimeField } from './time-field';
export function TimingTypeFields({
  type,
  startTime,
  endTime,
  relativeId,
  dependency,
  earlierRows,
  onChange,
}: {
  type: TimingType;
  startTime: string | null;
  endTime: string | null;
  relativeId: string | null;
  dependency: { nl: string; en: string };
  earlierRows: ContextRow[];
  onChange: (field: string, value: string | null | { nl: string; en: string }) => void;
}) {
  if (type === 'none')
    return (
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
        No timing fields are needed for this type.
      </p>
    );
  if (type === 'relative')
    return (
      <div className="space-y-4">
        <label className="block text-sm font-semibold">
          Relative to an earlier action
          <select
            className="field mt-2"
            value={relativeId ?? ''}
            onChange={(e) => onChange('relativeToContextId', e.target.value || null)}
          >
            <option value="">Choose earlier action</option>
            {earlierRows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.microActionTitle.en}
              </option>
            ))}
          </select>
        </label>
        <BilingualField
          label="Dependency text"
          nl={{
            value: dependency.nl,
            onChange: (e) =>
              onChange('dependencyText', { ...dependency, nl: e.currentTarget.value }),
          }}
          en={{
            value: dependency.en,
            onChange: (e) =>
              onChange('dependencyText', { ...dependency, en: e.currentTarget.value }),
          }}
        />
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold">
        {type === 'anchor' ? 'Anchor time' : 'Start time'}
        <TimeField
          value={startTime ?? ''}
          onChange={(e) => onChange('startTime', e.target.value || null)}
        />
      </label>
      {type === 'window' && (
        <label className="text-sm font-semibold">
          End time
          <TimeField
            value={endTime ?? ''}
            onChange={(e) => onChange('endTime', e.target.value || null)}
          />
        </label>
      )}
    </div>
  );
}
