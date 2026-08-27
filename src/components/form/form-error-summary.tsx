import { AlertTriangle } from 'lucide-react';
import type { FieldErrors } from 'react-hook-form';

/**
 * Shown when validation blocks a submit.
 *
 * react-hook-form silently refuses to call the submit handler when a field fails validation, so a
 * value stored before an enum changed — a level of "beginner" against a newer list, say — made
 * Save look like it did nothing: no request left the browser and no message appeared. Any blocked
 * submit now says so, and names the fields.
 */
const LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Short description',
  coherence: 'Coherence sentence',
  suggestedTiming: 'Suggested timing',
  primaryLabel: 'Primary label',
  daypart: 'Daypart',
  level: 'Level',
  functionTag: 'Function',
  labels: 'Labels',
  durationMin: 'Duration',
  effect: 'Effect',
  howTo: 'How-to',
  warning: 'Warning',
};

const readable = (path: string) => LABELS[path.split('.')[0]] ?? path.split('.')[0];

function collect(errors: FieldErrors, prefix = ''): string[] {
  return Object.entries(errors).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!value) return [];
    if (typeof (value as { message?: unknown }).message === 'string')
      return [`${readable(path)} — ${(value as { message: string }).message}`];
    return collect(value as FieldErrors, path);
  });
}

export function FormErrorSummary({ errors }: { errors: FieldErrors }) {
  const messages = [...new Set(collect(errors))];
  if (!messages.length) return null;
  return (
    <div
      role="alert"
      className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
      <div className="text-sm text-red-800">
        <p className="font-semibold">Not saved — {messages.length} field needs attention.</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
