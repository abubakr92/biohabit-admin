import { z } from 'zod';
const bilingual = z.object({ nl: z.string(), en: z.string() });
export const stackSchema = z
  .object({
    title: bilingual,
    description: bilingual,
    coherence: bilingual,
    suggestedTiming: bilingual,
    functionTag: z.enum(['regulate', 'activate', 'build', 'recover']),
    primaryLabel: z.string().min(1, 'Choose a primary label.'),
    supportingLabels: z.array(z.string()),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    isPremium: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isActive) return;
    const missing: string[] = [];
    for (const [field, content] of Object.entries({
      title: value.title,
      description: value.description,
      coherence: value.coherence,
      suggestedTiming: value.suggestedTiming,
    })) {
      if (!content.nl.trim()) missing.push(`${field} (NL)`);
      if (!content.en.trim()) missing.push(`${field} (EN)`);
    }
    if (missing.length)
      ctx.addIssue({
        code: 'custom',
        path: ['isActive'],
        message: `Complete before activating: ${missing.join(', ')}.`,
      });
  });
export type StackFormValues = z.infer<typeof stackSchema>;
