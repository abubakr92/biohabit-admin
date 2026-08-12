export type FunctionTag = 'regulate' | 'activate' | 'build' | 'recover';
export type Daypart = 'morning' | 'midday' | 'evening';
export type Mode = 'essential' | 'balanced' | 'full';
export type TimingType = 'none' | 'exact' | 'window' | 'relative' | 'anchor';
export type AccessLevel = 'free' | 'premium' | 'test' | 'admin';

// TODO(client): allowed values not yet specified — confirm before launch.
// `beginner | intermediate | advanced` is a placeholder. Nothing reads it in this codebase; it is
// stored for the mobile app. When the real scale is agreed, change all SEVEN declarations together
// — updating one side alone makes every save fail validation with a 422:
//   1. src/types/models.ts            (this type)
//   2. src/lib/constants/enums.ts     (the dropdown options)
//   3. src/lib/validation/stack.ts
//   4. src/lib/validation/micro-action.ts
//   5. functions/src/types.ts
//   6. functions/src/schemas.ts       (stackBase)
//   7. functions/src/schemas.ts       (microActionSchema)
// Then migrate existing content: functions/src/seed-data.ts and any live stacks/microActions
// already carrying an old value. The pinning test in functions/test/schemas.test.js will fail
// until it is updated too, which is deliberate — it is the reminder that both sides must move.
export type Level = 'beginner' | 'intermediate' | 'advanced';

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

export interface AppUser {
  id: string;
  email: string;
  accessLevel: AccessLevel;
  rhythmDaysCount: number;
  unlockedAt: string | null;
  lastCheckOffAt: string | null;
  createdAt: string;
}
