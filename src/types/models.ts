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
 * How demanding a stack or micro-action is — difficulty, not mode.
 *
 * These are separate questions and must not be conflated: which actions a member sees in each mode
 * is decided by a context row's `includedInMode`, which keeps its own `essential | balanced | full`
 * vocabulary. Level is stored for categorisation only; nothing in the app branches on it yet.
 */
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';

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
  /**
   * Orders two stacks that share a daypart, lowest first. Distinct from a context row's
   * `stackSortOrder`, which orders micro-actions *inside* one stack — the two must never be
   * conflated. A template-level field only: the app does not let members drag Home or Agenda.
   */
  stackOrder: number;
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
  /**
   * The function this action usually serves. A context row inherits it unless it overrides, so the
   * field only needs attention where a stack uses the action differently. Null until an editor
   * sets one — deliberately not defaulted, so "not set" stays visible rather than guessed.
   */
  defaultFunctionTag: FunctionTag | null;
  usedInStacksCount: number;
}

export interface ContextRow {
  id: string;
  stackId: string;
  microActionId: string;
  microActionTitle: Bilingual;
  /**
   * The function this action serves *inside this stack*, which is not always the one it serves
   * elsewhere — a post-meal walk regulates in a glucose stack and activates in a movement break.
   * Null means inherit the micro-action's `defaultFunctionTag`. Because each row carries its own,
   * one stack normally lights more than one ring.
   */
  functionTag: FunctionTag | null;
  /** The effective, visible order of this row inside its stack. Drag-and-drop owns it. */
  stackSortOrder: number;
  /**
   * Order within a mode, never depth. Retained because the v1.8 data model defines it, but nothing
   * in this panel or the API sorts by it — `stackSortOrder` is the effective order. Kept rather
   * than dropped: removing a spec field because its admin input is hidden is not the panel's call.
   */
  priorityOrder: number;
  isOptional: boolean;
  isActiveByDefault: boolean;
  includedInMode: Mode;
  /**
   * Null means inherit the parent stack's daypart, and that is the default for a new row. A stored
   * value is a deliberate override: this action runs in a different part of the day from the stack
   * it belongs to, and the app places it accordingly.
   */
  daypart: Daypart | null;
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

/**
 * Push copy the app renders, kept here so wording changes ship without an app release.
 *
 * Field names follow this database's camelCase convention; the specification writes them in
 * snake_case (`trigger_key`, `title_nl`, …), exactly as it writes `stack_sort_order` for the
 * stored `stackSortOrder`. `triggerKey` values stay verbatim from the spec — Build 1 defines
 * `series_anchor`.
 */
export interface NotificationTemplate {
  id: string;
  triggerKey: string;
  title: Bilingual;
  body: Bilingual;
  /** Where tapping the notification lands in the app. Empty when it just opens Home. */
  deeplinkTarget: string;
  isActive: boolean;
  updatedAt: string;
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
  sourceStackId: string | null;
  sourceStackTitle: string | null;
  mode: string;
  weekdays: Weekday[];
  repeat: string | null;
  anchorLabel: string | null;
  startsAt: string | null;
  durationMinutes: number | null;
  notificationOn: boolean;
  enabled: boolean;
  status: RoutineStatus;
  actionCount: number;
  createdAt: ApiDate;
  updatedAt: ApiDate;
}

export interface UserRoutineAction {
  id: string;
  routineId: string;
  /** Null when the member typed a one-off action instead of picking one from the library. */
  microActionId: string | null;
  title: string;
  microActionTitle: Bilingual;
  sortOrder: number;
  startTime: string | null;
  /** The app stores duration as free text ("2 min"); both the label and a parsed number arrive. */
  durationLabel: string | null;
  durationMin: number | null;
  depth: string | null;
  isActive: boolean;
  isUserAdded: boolean;
  /** The contextRows id this action was seeded from, when it came from a template. */
  sourceStepId: string | null;
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
