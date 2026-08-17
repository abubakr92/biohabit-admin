import type { ApiDate } from '@/types/models';

/**
 * Timestamps reach the panel in two shapes. Documents written by the admin API carry ISO strings;
 * documents written by the mobile app carry raw Firestore Timestamps, which have no `toJSON` and so
 * serialise as `{_seconds, _nanoseconds}`. Passing that object to `new Date()` yields Invalid Date,
 * which makes `Intl.DateTimeFormat.format` throw — so every timestamp is normalised here first.
 */
export function toDate(value: ApiDate | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  // Both spellings are read directly: the optional members defeat `in`-based narrowing, and the
  // admin SDK's `_seconds` and the web SDK's `seconds` are otherwise interchangeable here.
  const ts = value as Partial<
    Record<'_seconds' | '_nanoseconds' | 'seconds' | 'nanoseconds', number>
  >;
  const seconds = ts._seconds ?? ts.seconds;
  const nanoseconds = ts._nanoseconds ?? ts.nanoseconds ?? 0;
  if (typeof seconds !== 'number') return null;
  const parsed = new Date(seconds * 1000 + Math.round(nanoseconds / 1e6));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const formatDate = (value: ApiDate | undefined) => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        date,
      )
    : '—';
};

export const relativeDays = (value: ApiDate | undefined) => {
  const date = toDate(value);
  return date ? Math.floor((Date.now() - date.getTime()) / 86_400_000) : Infinity;
};
