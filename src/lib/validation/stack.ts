import { z } from 'zod';

const bilingualRequired = z.object({
  nl: z.string().trim().min(1, 'Required'),
  en: z.string().trim().min(1, 'Required'),
});
const bilingual = z.object({ nl: z.string(), en: z.string() });

// A draft needs only a title; these become required to publish. Mirrors functions/src/schemas.ts.
export const PUBLISH_REQUIRED = ['description', 'coherence', 'suggestedTiming'] as const;
export const FIELD_LABELS: Record<(typeof PUBLISH_REQUIRED)[number], string> = {
  description: 'Short description',
  coherence: 'Coherence sentence',
  suggestedTiming: 'Suggested timing',
};

// One segment's start: a moment plus an offset, or a fixed clock time — exactly one. Mirrors the API.
const anchorSchema = z
  .object({
    moment: z
      .enum(['wake', 'firstMeal', 'workStart', 'secondMeal', 'workEnd', 'lastMeal', 'bed'])
      .nullable(),
    offsetMin: z
      .number({ message: 'Enter minutes, or 0 for at the moment.' })
      .int('Use whole minutes.')
      .min(-720, 'Keep the offset within 12 hours.')
      .max(720, 'Keep the offset within 12 hours.'),
    fixedTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour HH:mm time.')
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.moment && !value.fixedTime)
      ctx.addIssue({
        code: 'custom',
        path: ['moment'],
        message: 'Choose a moment or a fixed time.',
      });
  });

export const stackSchema = z
  .object({
    title: bilingualRequired,
    description: bilingual,
    coherence: bilingual,
    suggestedTiming: bilingual,
    functionTag: z.enum(['regulate', 'activate', 'build', 'recover']),
    primaryLabel: z.string().min(1, 'Choose a primary label.'),
    supportingLabels: z.array(z.string()),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    daypart: z.enum(['morning', 'midday', 'evening']).nullable(),
    // Orders two stacks that share a daypart. Not a context row's stackSortOrder.
    stackOrder: z.number().int().min(0, 'Use 0 or a positive whole number.'),
    defaultAnchors: z.object({
      morning: anchorSchema.optional(),
      midday: anchorSchema.optional(),
      evening: anchorSchema.optional(),
    }),
    isPremium: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isActive) return;
    for (const field of PUBLISH_REQUIRED)
      for (const locale of ['nl', 'en'] as const)
        if (!value[field][locale].trim())
          ctx.addIssue({
            code: 'custom',
            path: [field, locale],
            message: 'Required before activating.',
          });
    if (!value.daypart)
      ctx.addIssue({
        code: 'custom',
        path: ['daypart'],
        message: 'Choose a daypart before activating.',
      });
  });

export type StackFormValues = z.infer<typeof stackSchema>;

/** Field names still empty, for the message shown when someone flips Active on an incomplete stack. */
export function missingForPublish(
  value: Pick<StackFormValues, (typeof PUBLISH_REQUIRED)[number] | 'daypart'>,
) {
  const missing: string[] = [];
  for (const field of PUBLISH_REQUIRED) {
    if (!value[field].nl.trim()) missing.push(`${FIELD_LABELS[field]} (NL)`);
    if (!value[field].en.trim()) missing.push(`${FIELD_LABELS[field]} (EN)`);
  }
  if (!value.daypart) missing.push('Daypart');
  return missing;
}
