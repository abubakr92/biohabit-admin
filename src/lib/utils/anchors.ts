import type {
  ContextRow,
  Daypart,
  DefaultAnchors,
  MicroAction,
  Moment,
  StackAnchor,
} from '@/types/models';
import { dayparts } from '@/lib/constants/enums';

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const toClock = (total: number) => {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

/**
 * The rule the app applies (Build 8 open items, C1): anchor = the user's time for the moment, else
 * the moment's default time, plus the segment's offset. The panel has no user, so it previews with
 * the default. Null when the moment has no default time yet — never a guessed clock time.
 */
export function anchorClock(anchor: StackAnchor | undefined, moments: Moment[]): string | null {
  if (!anchor) return null;
  if (anchor.fixedTime) return anchor.fixedTime;
  const moment = moments.find((item) => item.key === anchor.moment);
  return moment?.defaultTime ? toClock(toMinutes(moment.defaultTime) + anchor.offsetMin) : null;
}

/** "Bed − 90 min", "At first meal", "Fixed 07:00". */
export function describeAnchor(anchor: StackAnchor | undefined, moments: Moment[]): string {
  if (!anchor) return 'No anchor';
  if (anchor.fixedTime) return `Fixed ${anchor.fixedTime}`;
  const name = moments.find((item) => item.key === anchor.moment)?.label.en ?? anchor.moment;
  if (!anchor.offsetMin) return `At ${name?.toLowerCase()}`;
  return `${name} ${anchor.offsetMin < 0 ? '−' : '+'} ${Math.abs(anchor.offsetMin)} min`;
}

/**
 * A segment is the part of a stack that runs in one daypart: the stack's own daypart, plus any
 * daypart a row overrides to. Dayparts that still hold a stored anchor are kept so it stays visible.
 */
export function segmentsOf(
  stackDaypart: Daypart | null,
  rows: Pick<ContextRow, 'daypart'>[],
  anchors: DefaultAnchors,
): Daypart[] {
  const used = new Set<Daypart>();
  if (stackDaypart) used.add(stackDaypart);
  rows.forEach((row) => row.daypart && used.add(row.daypart));
  (Object.keys(anchors) as Daypart[]).forEach((daypart) => used.add(daypart));
  return dayparts.filter((daypart) => used.has(daypart));
}

/**
 * Start time of each row, segment by segment, in the order given. The first action starts at its
 * segment's anchor; an action without its own time starts when the one above it ends. An action
 * with its own time keeps it. Null where no anchor can be resolved — there is no 07:00 fallback.
 */
export function startTimes(
  rows: ContextRow[],
  actions: MicroAction[],
  stackDaypart: Daypart | null,
  anchors: DefaultAnchors,
  moments: Moment[],
): Map<string, string | null> {
  const cursor = new Map<Daypart | null, number | null>();
  const result = new Map<string, string | null>();
  for (const row of rows) {
    const segment = row.daypart ?? stackDaypart;
    if (!cursor.has(segment)) {
      const start = segment ? anchorClock(anchors[segment], moments) : null;
      cursor.set(segment, start ? toMinutes(start) : null);
    }
    const ownTime =
      row.timingType !== 'none' && row.timingType !== 'relative' ? row.startTime : null;
    const start = ownTime ? toMinutes(ownTime) : (cursor.get(segment) ?? null);
    result.set(row.id, start === null ? null : toClock(start));
    const duration =
      row.durationOverrideMin ??
      actions.find((action) => action.id === row.microActionId)?.durationMin ??
      0;
    cursor.set(segment, start === null ? null : start + duration);
  }
  return result;
}
