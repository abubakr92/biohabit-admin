'use client';
import { useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { Daypart, DefaultAnchors, Moment, MomentKey, StackAnchor } from '@/types/models';
import { labelFor } from '@/lib/constants/enums';
import { anchorClock, describeAnchor } from '@/lib/utils/anchors';

/**
 * Typed as text so a leading minus can be entered; a number input would reset it mid-keystroke.
 * Kept locally until it parses, then reported.
 */
function OffsetInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  return (
    <input
      className="field mt-2"
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        const next = event.target.value.replace('−', '-');
        setText(next);
        if (/^-?\d+$/.test(next)) onChange(Number(next));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

/**
 * One anchor per segment. Choosing a moment links the segment to that moment's time (the member's
 * own in Your day, else the default here); "fixed time" is its own anchor that no moment moves.
 */
export function SegmentAnchors({
  segments,
  value,
  moments,
  errors,
  onChange,
}: {
  segments: Daypart[];
  value: DefaultAnchors;
  moments: Moment[];
  errors?: FieldErrors<Record<Daypart, StackAnchor>>;
  onChange: (next: DefaultAnchors) => void;
}) {
  const set = (daypart: Daypart, anchor: StackAnchor | null) => {
    const next = { ...value };
    if (anchor) next[daypart] = anchor;
    else delete next[daypart];
    onChange(next);
  };
  if (!segments.length)
    return (
      <p className="text-sm text-slate-500">
        Choose the stack&rsquo;s daypart first; each daypart the stack runs in gets its own anchor.
      </p>
    );
  return (
    <div className="space-y-4">
      {segments.map((daypart) => {
        const anchor = value[daypart];
        const mode =
          anchor?.fixedTime !== null && anchor?.fixedTime !== undefined
            ? 'fixed'
            : (anchor?.moment ?? '');
        const clock = anchorClock(anchor, moments);
        const moment = moments.find((item) => item.key === anchor?.moment);
        const error = errors?.[daypart];
        return (
          <div key={daypart} className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">
              {labelFor(daypart)} segment
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Starts at
                <select
                  className="field mt-2"
                  value={mode}
                  onChange={(event) => {
                    const choice = event.target.value;
                    if (!choice) return set(daypart, null);
                    if (choice === 'fixed')
                      return set(daypart, {
                        moment: null,
                        offsetMin: 0,
                        fixedTime: anchor?.fixedTime ?? '',
                      });
                    set(daypart, {
                      moment: choice as MomentKey,
                      offsetMin: anchor?.moment ? anchor.offsetMin : 0,
                      fixedTime: null,
                    });
                  }}
                >
                  <option value="">Not set</option>
                  <optgroup label="Moment">
                    {moments.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label.en}
                      </option>
                    ))}
                  </optgroup>
                  <option value="fixed">Fixed clock time</option>
                </select>
                {error?.moment?.message && (
                  <span className="mt-1 block text-xs text-red-600">{error.moment.message}</span>
                )}
              </label>
              {mode === 'fixed' ? (
                <label className="text-sm font-semibold">
                  Fixed time
                  <input
                    type="time"
                    className="field mt-2"
                    value={anchor?.fixedTime ?? ''}
                    onChange={(event) =>
                      set(daypart, { moment: null, offsetMin: 0, fixedTime: event.target.value })
                    }
                  />
                  {error?.fixedTime?.message && (
                    <span className="mt-1 block text-xs text-red-600">
                      {error.fixedTime.message}
                    </span>
                  )}
                </label>
              ) : mode ? (
                <label className="text-sm font-semibold">
                  Offset (minutes)
                  <OffsetInput
                    key={`${daypart}-${anchor?.moment}`}
                    value={anchor?.offsetMin ?? 0}
                    onChange={(offsetMin) => anchor && set(daypart, { ...anchor, offsetMin })}
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Negative is before the moment, 0 is at the moment.
                  </span>
                  {error?.offsetMin?.message && (
                    <span className="mt-1 block text-xs text-red-600">
                      {error.offsetMin.message}
                    </span>
                  )}
                </label>
              ) : null}
            </div>
            {anchor && (anchor.fixedTime || moment) && (
              <p className="mt-3 text-sm text-slate-600">
                {anchor.fixedTime
                  ? `Starts at ${anchor.fixedTime}. No moment moves it.`
                  : clock
                    ? `${describeAnchor(anchor, moments)} → starts ${clock} with the default time (${moment!.label.en} ${moment!.defaultTime}). A member's own time for ${moment!.label.en} in Your day moves it.`
                    : `${describeAnchor(anchor, moments)} — ${moment!.label.en} has no default time yet; set it on the Moments page.`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
