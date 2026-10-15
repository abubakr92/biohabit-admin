export type FunctionTag = 'regulate' | 'activate' | 'build' | 'recover';
export type Daypart = 'morning' | 'midday' | 'evening';
export type Mode = 'essential' | 'balanced' | 'full';
export type TimingType = 'none' | 'exact' | 'window' | 'relative' | 'anchor';
export type AccessLevel = 'free' | 'premium' | 'test' | 'admin';
// Difficulty, not mode. Must stay identical to the Level type in src/types/models.ts.
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export interface Bilingual { nl: string; en: string }
// The seven moments of a day. Keys are the ones the app already writes to users/{uid}.baseMoments,
// so a user's own time and the panel's default line up by key.
export type MomentKey = 'wake' | 'firstMeal' | 'workStart' | 'secondMeal' | 'workEnd' | 'lastMeal' | 'bed';
export interface MomentInput { label: Bilingual; daypart: Daypart; defaultTime: string }
// `updatedAt` null means the moment has not been configured yet: no document exists for it.
export interface Moment { key: MomentKey; sortOrder: number; label: Bilingual; daypart: Daypart | null; defaultTime: string | null; updatedAt: string | null }
// Where one segment of a stack starts. Either a moment plus an offset in minutes, or a fixed clock
// time that no moment moves — never both. Anchor = the user's time for the moment (else its
// default) + offsetMin.
export interface StackAnchor { moment: MomentKey | null; offsetMin: number; fixedTime: string | null }
// One anchor per segment, keyed by the segment's daypart — the same keying the app uses for a
// routine's `moments`. A stack whose rows all share its daypart has one segment.
export type DefaultAnchors = Partial<Record<Daypart, StackAnchor>>;
// `stackOrder` orders two stacks that share a daypart. It is not `stackSortOrder`, which orders
// micro-actions inside one stack.
export interface StackInput { title: Bilingual; description: Bilingual; coherence: Bilingual; suggestedTiming: Bilingual; functionTag: FunctionTag; primaryLabel: string; supportingLabels: string[]; level: Level; daypart: Daypart | null; stackOrder: number; defaultAnchors: DefaultAnchors; isPremium: boolean; isActive: boolean }
export interface Stack extends StackInput { id: string; actionCount: number; modeDurations: Record<Mode, number>; createdAt: string; updatedAt: string }
export interface MicroActionInput { title: Bilingual; effect: Bilingual; howTo: Bilingual; warning: Bilingual; labels: string[]; durationMin: number; level: Level; defaultFunctionTag: FunctionTag | null }
export interface MicroAction extends MicroActionInput { id: string; usedInStacksCount: number }
// `daypart: null` means inherit the parent stack's daypart; a value is a deliberate override.
// `priorityOrder` is order within a mode, never depth, and nothing sorts by it — `stackSortOrder`
// is the effective order.
export interface ContextRowInput { microActionId: string; microActionTitle: Bilingual; functionTag: FunctionTag | null; stackSortOrder: number; priorityOrder: number; isOptional: boolean; isActiveByDefault: boolean; includedInMode: Mode; daypart: Daypart | null; durationOverrideMin: number | null; timingType: TimingType; startTime: string | null; endTime: string | null; relativeToContextId: string | null; dependencyText: Bilingual; contextEffect: Bilingual; contextWarning: Bilingual; centreTime: string | null; elasticityMin: number | null }
export interface ContextRow extends ContextRowInput { id: string; stackId: string }
export interface LabelInput { key: string; name: Bilingual }
// Push copy, editable without an app release. camelCase here mirrors the spec's snake_case
// (`trigger_key` → `triggerKey`), the same mapping `stack_sort_order` → `stackSortOrder` already uses.
export interface NotificationTemplateInput { triggerKey: string; title: Bilingual; body: Bilingual; deeplinkTarget: string; isActive: boolean }
export interface NotificationTemplate extends NotificationTemplateInput { id: string; updatedAt: string }
export interface Label extends LabelInput { id: string; usageCount: number }
export interface AppUser { id: string; email: string; accessLevel: AccessLevel; rhythmDaysCount: number; unlockedAt: string | null; lastCheckOffAt: string | null; createdAt: string }

// --- Member activity -------------------------------------------------------
// The app records completions as one document per day at users/{uid}/checkOffs/{YYYY-MM-DD},
// holding the contextRow ids ticked that day. Those rows belong to admin-authored stacks: members
// follow the Library directly, so there is no user-owned routine to read.
export interface CheckOffStep { stepId: string; microActionId: string; microActionTitle: Bilingual; stackId: string; stackTitle: string }
export interface StackBreakdown { stackId: string; stackTitle: string; completed: number; total: number }
export interface CheckOffDay { day: string; updatedAt: string | null; stepCount: number; steps: CheckOffStep[]; stacks: StackBreakdown[] }
export interface DayActivity { date: string; stepsCompleted: number }
export interface UserActivity { days: DayActivity[]; currentStreak: number; activeDays: number; totalSteps: number }
export interface UserPreferences { need: string | null; timing: string | null; focus: string | null; budget: string | null; selected: boolean; setAt: string | null }
