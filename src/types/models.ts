export type FunctionTag = 'regulate' | 'activate' | 'build' | 'recover';
export type Daypart = 'morning' | 'midday' | 'evening';
export type Mode = 'essential' | 'balanced' | 'full';
export type TimingType = 'none' | 'exact' | 'window' | 'relative' | 'anchor';
// `user` is written by the mobile app's signup flow; the other four are this panel's own
// vocabulary. The two systems have not agreed on one set yet — see the note on AppUser.
export type AccessLevel = 'free' | 'premium' | 'test' | 'admin' | 'user';

/**
 * A timestamp as it actually arrives from the API. Documents this panel writes carry ISO strings;
 * documents the mobile app writes carry Firestore Timestamps, which serialise as
 * `{_seconds, _nanoseconds}`. Read these through `toDate` in lib/utils/format rather than passing
 * them to `new Date()` directly.
 */
export type ApiDate =
  | string
  | number
  | Date
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | null;

/**
 * The mode tier a stack or micro-action is pitched at. Deliberately shares its vocabulary with
 * `Mode`, but the two answer different questions and are not interchangeable:
 *
 *   Level            — how demanding this piece of content is overall.
 *   includedInMode   — from which mode a given context row starts appearing.
 *
 * A single stack still spans all three modes; its `level` is the tier it is written for, while
 * each row's `includedInMode` decides what a member actually sees in each mode.
 */
export type Level = 'essential' | 'balanced' | 'full';

export interface Bilingual {
  nl: string;
  en: string;
}

export interface Stack {
  id: string;
  title: Bilingual;
  description: Bilingual;
  coherence: Bilingual;
  suggestedTiming: Bilingual;
  functionTag: FunctionTag;
  primaryLabel: string;
  supportingLabels: string[];
  level: Level;
  // The third axis stacks are classified on, alongside label and function. Null while a stack is
  // still a draft; required to publish.
  daypart: Daypart | null;
  isPremium: boolean;
  isActive: boolean;
  actionCount: number;
  modeDurations: Record<Mode, number>; // derived server-side
  createdAt: string;
  updatedAt: string;
}

export interface MicroAction {
  id: string;
  title: Bilingual;
  effect: Bilingual;
  howTo: Bilingual;
  warning: Bilingual;
  labels: string[];
  durationMin: number;
  level: Level;
  usedInStacksCount: number;
}

export interface ContextRow {
  id: string;
  stackId: string;
  microActionId: string;
  microActionTitle: Bilingual;
  stackSortOrder: number;
  priorityOrder: number;
  isOptional: boolean;
  isActiveByDefault: boolean;
  includedInMode: Mode;
  daypart: Daypart;
  durationOverrideMin: number | null;
  timingType: TimingType;
  startTime: string | null;
  endTime: string | null;
  relativeToContextId: string | null;
  dependencyText: Bilingual;
  contextEffect: Bilingual;
  contextWarning: Bilingual;
  centreTime: string | null;
  elasticityMin: number | null;
}

export interface Label {
  id: string;
  key: string;
  name: Bilingual;
  usageCount: number;
}

/**
 * Written by two systems. This panel creates the admin profile; the mobile app creates member
 * profiles through its own signup and email-OTP flow, which is why timestamps arrive in either
 * shape and why `name`, `avatarUrl` and `verified` exist without the panel having asked for them.
 */
export interface AppUser {
  id: string;
  email: string;
  accessLevel: AccessLevel;
  rhythmDaysCount: number;
  unlockedAt: ApiDate;
  lastCheckOffAt: ApiDate;
  createdAt: ApiDate;
  // Set by the mobile app only; absent on profiles this panel created.
  name?: string;
  avatarUrl?: string | null;
  verified?: boolean;
}

// ---------------------------------------------------------------------------
// User routines
//
// Routines are owned by app members, not by this panel: they are read-only
// everywhere in the admin. A routine either starts from a Library stack
// template or is built from scratch, and from then on the member owns it. The
// only thing routines share with templates is the micro-action library, which
// they reference and never modify.
// ---------------------------------------------------------------------------

export type RoutineSource = 'template' | 'custom';
export type RoutineStatus = 'active' | 'inactive' | 'expired';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface UserRoutine {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  source: RoutineSource;
  /** Both null for a routine built from scratch. */
  sourceStackId: string | null;
  sourceStackTitle: string | null;
  mode: Mode;
  weekdays: Weekday[];
  startDate: string;
  endDate: string | null;
  anchorTime: string | null;
  notificationOn: boolean;
  status: RoutineStatus;
  actionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoutineAction {
  id: string;
  routineId: string;
  microActionId: string;
  microActionTitle: Bilingual;
  sortOrder: number;
  startTime: string | null;
  durationMin: number;
  includedInMode: Mode;
  isActive: boolean;
  /** True when the member added this action themselves, rather than inheriting it. */
  isUserAdded: boolean;
}

/** What a member changed relative to the template they started from. */
export interface RoutineDivergence {
  nameChanged: boolean;
  actionsAdded: number;
  actionsRemoved: number;
  orderChanged: boolean;
  timesChanged: number;
}

export interface DailyCompletion {
  date: string;
  started: number;
  planned: number;
  percentage: number;
}

export interface CheckOff {
  id: string;
  userId: string;
  routineId: string;
  routineTitle: string;
  microActionTitle: Bilingual;
  startedAt: string;
  modeUsed: Mode;
}

// ---------------------------------------------------------------------------
// Member activity — the shape the app actually writes.
//
// Completions live at users/{uid}/checkOffs/{YYYY-MM-DD}: one document per day holding the
// contextRow ids ticked that day. Those rows belong to admin-authored stacks, so a member's
// activity is measured against the Library, not against a routine of their own.
// ---------------------------------------------------------------------------

export interface CheckOffStep {
  stepId: string;
  microActionId: string;
  microActionTitle: Bilingual;
  stackId: string;
  stackTitle: string;
}

export interface StackBreakdown {
  stackId: string;
  stackTitle: string;
  completed: number;
  total: number;
}

export interface CheckOffDay {
  day: string;
  updatedAt: ApiDate;
  stepCount: number;
  steps: CheckOffStep[];
  stacks: StackBreakdown[];
}

/** A count, not a percentage: the panel has no honest denominator for what a member "should" do. */
export interface DayActivity {
  date: string;
  stepsCompleted: number;
}

/** Onboarding answers. These map onto the same axes stacks are classified by. */
export interface UserPreferences {
  need: string | null;
  timing: string | null;
  focus: string | null;
  budget: string | null;
  selected: boolean;
  setAt: ApiDate;
}
