import { z } from 'zod';
const bilingual = z.object({ nl: z.string(), en: z.string() });
const timeOrNull = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour HH:mm time.')
  .nullable();
export const contextRowSchema = z
  .object({
    microActionId: z.string().min(1),
    microActionTitle: bilingual,
    stackSortOrder: z.number().min(0),
    priorityOrder: z.number().min(1),
    isOptional: z.boolean(),
    isActiveByDefault: z.boolean(),
    includedInMode: z.enum(['essential', 'balanced', 'full']),
    daypart: z.enum(['morning', 'midday', 'evening']),
    durationOverrideMin: z.number().min(1).nullable(),
    timingType: z.enum(['none', 'exact', 'window', 'relative', 'anchor']),
    startTime: timeOrNull,
    endTime: timeOrNull,
    relativeToContextId: z.string().nullable(),
    dependencyText: bilingual,
    contextEffect: bilingual,
    contextWarning: bilingual,
    centreTime: timeOrNull,
    elasticityMin: z.number().min(0).nullable(),
  })
  .superRefine((value, ctx) => {
    if (['exact', 'anchor', 'window'].includes(value.timingType) && !value.startTime)
      ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required.' });
    if (value.timingType === 'window' && !value.endTime)
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time is required.' });
    if (
      value.timingType === 'window' &&
      value.startTime &&
      value.endTime &&
      value.endTime <= value.startTime
    )
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'End time must be after the start time.',
      });
    if (value.timingType === 'relative') {
      if (!value.relativeToContextId)
        ctx.addIssue({
          code: 'custom',
          path: ['relativeToContextId'],
          message: 'Choose an earlier action.',
        });
      if (!value.dependencyText.nl || !value.dependencyText.en)
        ctx.addIssue({
          code: 'custom',
          path: ['dependencyText'],
          message: 'Describe the dependency in NL and EN.',
        });
    }
  });
export type ContextRowFormValues = z.infer<typeof contextRowSchema>;
