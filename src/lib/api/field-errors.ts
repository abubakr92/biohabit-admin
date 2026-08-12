import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './client';

/**
 * Maps a 422 response onto the form fields that produced it. The API keys `fieldErrors` by dotted
 * path (`description.nl`), which is the same shape react-hook-form addresses fields with.
 * Returns false when the failure was not field-level, so the caller can fall back to a toast.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.fieldErrors) return false;
  const entries = Object.entries(error.fieldErrors).filter(
    ([field, messages]) => field !== '_' && messages?.length,
  );
  if (!entries.length) return false;
  for (const [field, messages] of entries)
    setError(field as Path<T>, { type: 'server', message: messages[0] });
  return true;
}
