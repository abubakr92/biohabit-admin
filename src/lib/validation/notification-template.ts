import { z } from 'zod';

const bilingual = z.object({
  nl: z.string().trim().min(1, 'Required'),
  en: z.string().trim().min(1, 'Required'),
});

/**
 * Push copy, edited here rather than shipped in the app binary. Mirrors
 * `notificationTemplateSchema` in functions/src/schemas.ts.
 *
 * Build 1 defines a single trigger, `series_anchor`. The key is free text rather than a closed
 * list so the panel does not hard-code a set the specification may extend, but nothing here adds
 * a Phase 2 trigger on its own.
 */
export const notificationTemplateSchema = z.object({
  triggerKey: z.string().regex(/^[a-z0-9_]+$/, 'Use lowercase letters, digits and underscores.'),
  title: bilingual,
  body: bilingual,
  deeplinkTarget: z.string().trim().max(200, 'Keep this under 200 characters.'),
  isActive: z.boolean(),
});

export type NotificationTemplateFormValues = z.infer<typeof notificationTemplateSchema>;
