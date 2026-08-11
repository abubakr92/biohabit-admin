import { z } from 'zod';

const bilingualRequired = z.object({ nl: z.string().trim().min(1), en: z.string().trim().min(1) });
const bilingualOptional = z.object({ nl: z.string(), en: z.string() });
const stackBase = z.object({ title: bilingualRequired, description: bilingualRequired, coherence: bilingualRequired, suggestedTiming: bilingualRequired, functionTag: z.enum(['regulate', 'activate', 'build', 'recover']), primaryLabel: z.string().min(1), supportingLabels: z.array(z.string()), level: z.enum(['beginner', 'intermediate', 'advanced']), isPremium: z.boolean(), isActive: z.boolean() });
export const stackSchema = stackBase;
export const microActionSchema = z.object({ title: bilingualRequired, effect: bilingualRequired, howTo: bilingualRequired, warning: bilingualRequired, labels: z.array(z.string()).min(1), durationMin: z.number().int().min(1).max(60), level: z.enum(['beginner', 'intermediate', 'advanced']) });
export const contextRowSchema = z.object({ microActionId: z.string().min(1), microActionTitle: bilingualRequired, stackSortOrder: z.number().int().min(0), priorityOrder: z.number().int().min(1), isOptional: z.boolean(), isActiveByDefault: z.boolean(), includedInMode: z.enum(['essential', 'balanced', 'full']), daypart: z.enum(['morning', 'midday', 'evening']), durationOverrideMin: z.number().int().min(1).nullable(), timingType: z.enum(['none', 'exact', 'window', 'relative', 'anchor']), startTime: z.string().nullable(), endTime: z.string().nullable(), relativeToContextId: z.string().nullable(), dependencyText: bilingualOptional, contextEffect: bilingualOptional, contextWarning: bilingualOptional, centreTime: z.string().nullable(), elasticityMin: z.number().int().min(0).nullable() }).superRefine((value, ctx) => {
  if (['exact', 'window', 'anchor'].includes(value.timingType) && !value.startTime) ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required.' });
  if (value.timingType === 'window' && !value.endTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time is required.' });
  if (value.timingType === 'relative') {
    if (!value.relativeToContextId) ctx.addIssue({ code: 'custom', path: ['relativeToContextId'], message: 'Choose an earlier context row.' });
    if (!value.dependencyText.nl.trim() || !value.dependencyText.en.trim()) ctx.addIssue({ code: 'custom', path: ['dependencyText'], message: 'Dependency text is required in NL and EN.' });
  }
});
export const labelSchema = z.object({ key: z.string().regex(/^[a-z0-9-]+$/), name: bilingualRequired });
export const reorderSchema = z.object({ stackId: z.string().min(1), ids: z.array(z.string()).min(1) });
