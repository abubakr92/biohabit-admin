import { z } from 'zod';

const bilingualRequired = z.object({ nl: z.string().trim().min(1), en: z.string().trim().min(1) });
const bilingualOptional = z.object({ nl: z.string(), en: z.string() });
const timeOrNull = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour HH:mm time.').nullable();
// Drafts stay saveable with only a title; the full bilingual set is required to activate.
const publishRequired = ['description', 'coherence', 'suggestedTiming'] as const;
const stackBase = z.object({ title: bilingualRequired, description: bilingualOptional, coherence: bilingualOptional, suggestedTiming: bilingualOptional, functionTag: z.enum(['regulate', 'activate', 'build', 'recover']), primaryLabel: z.string().min(1), supportingLabels: z.array(z.string()), level: z.enum(['beginner', 'intermediate', 'advanced']), isPremium: z.boolean(), isActive: z.boolean() });
export const stackSchema = stackBase.superRefine((value, ctx) => {
  if (!value.isActive) return;
  for (const field of publishRequired) for (const locale of ['nl', 'en'] as const) if (!value[field][locale].trim()) ctx.addIssue({ code: 'custom', path: [field, locale], message: 'Required before activating.' });
});
export const microActionSchema = z.object({ title: bilingualRequired, effect: bilingualRequired, howTo: bilingualRequired, warning: bilingualRequired, labels: z.array(z.string()).min(1), durationMin: z.number().int().min(1).max(60), level: z.enum(['beginner', 'intermediate', 'advanced']) });
export const contextRowSchema = z.object({ microActionId: z.string().min(1), microActionTitle: bilingualRequired, stackSortOrder: z.number().int().min(0), priorityOrder: z.number().int().min(1), isOptional: z.boolean(), isActiveByDefault: z.boolean(), includedInMode: z.enum(['essential', 'balanced', 'full']), daypart: z.enum(['morning', 'midday', 'evening']), durationOverrideMin: z.number().int().min(1).nullable(), timingType: z.enum(['none', 'exact', 'window', 'relative', 'anchor']), startTime: timeOrNull, endTime: timeOrNull, relativeToContextId: z.string().nullable(), dependencyText: bilingualOptional, contextEffect: bilingualOptional, contextWarning: bilingualOptional, centreTime: timeOrNull, elasticityMin: z.number().int().min(0).nullable() }).superRefine((value, ctx) => {
  if (['exact', 'window', 'anchor'].includes(value.timingType) && !value.startTime) ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required.' });
  if (value.timingType === 'window' && !value.endTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time is required.' });
  if (value.timingType === 'window' && value.startTime && value.endTime && value.endTime <= value.startTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after the start time.' });
  if (value.timingType === 'relative') {
    if (!value.relativeToContextId) ctx.addIssue({ code: 'custom', path: ['relativeToContextId'], message: 'Choose an earlier context row.' });
    if (!value.dependencyText.nl.trim() || !value.dependencyText.en.trim()) ctx.addIssue({ code: 'custom', path: ['dependencyText'], message: 'Dependency text is required in NL and EN.' });
  }
});
export const labelSchema = z.object({ key: z.string().regex(/^[a-z0-9-]+$/), name: bilingualRequired });
export const reorderSchema = z.object({ stackId: z.string().min(1), ids: z.array(z.string()).min(1) });
export const userQuerySchema = z.object({ status: z.enum(['all', 'silent', 'unlocked', 'locked']).default('all'), limit: z.coerce.number().int().min(1).max(200).default(50), cursor: z.string().min(1).optional() });
