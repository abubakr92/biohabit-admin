export type FunctionTag = 'regulate' | 'activate' | 'build' | 'recover';
export type Daypart = 'morning' | 'midday' | 'evening';
export type Mode = 'essential' | 'balanced' | 'full';
export type TimingType = 'none' | 'exact' | 'window' | 'relative' | 'anchor';
export type AccessLevel = 'free' | 'premium' | 'test' | 'admin';
// TODO(client): placeholder values awaiting confirmation. Must stay identical to the Level type in
// src/types/models.ts, which lists every declaration that has to change together.
export type Level = 'beginner' | 'intermediate' | 'advanced';
export interface Bilingual { nl: string; en: string }
export interface StackInput { title: Bilingual; description: Bilingual; coherence: Bilingual; suggestedTiming: Bilingual; functionTag: FunctionTag; primaryLabel: string; supportingLabels: string[]; level: Level; isPremium: boolean; isActive: boolean }
export interface Stack extends StackInput { id: string; actionCount: number; modeDurations: Record<Mode, number>; createdAt: string; updatedAt: string }
export interface MicroActionInput { title: Bilingual; effect: Bilingual; howTo: Bilingual; warning: Bilingual; labels: string[]; durationMin: number; level: Level }
export interface MicroAction extends MicroActionInput { id: string; usedInStacksCount: number }
export interface ContextRowInput { microActionId: string; microActionTitle: Bilingual; stackSortOrder: number; priorityOrder: number; isOptional: boolean; isActiveByDefault: boolean; includedInMode: Mode; daypart: Daypart; durationOverrideMin: number | null; timingType: TimingType; startTime: string | null; endTime: string | null; relativeToContextId: string | null; dependencyText: Bilingual; contextEffect: Bilingual; contextWarning: Bilingual; centreTime: string | null; elasticityMin: number | null }
export interface ContextRow extends ContextRowInput { id: string; stackId: string }
export interface LabelInput { key: string; name: Bilingual }
export interface Label extends LabelInput { id: string; usageCount: number }
export interface AppUser { id: string; email: string; accessLevel: AccessLevel; rhythmDaysCount: number; unlockedAt: string | null; lastCheckOffAt: string | null; createdAt: string }
