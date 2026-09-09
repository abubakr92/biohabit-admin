import { z } from 'zod';
const bilingual = z.object({
  nl: z.string().min(1, 'Required'),
  en: z.string().min(1, 'Required'),
});
// Warning is optional and is never auto-filled: an empty warning is what tells the app to leave
// the warning block out altogether. Effect stays required.
const bilingualOptional = z.object({ nl: z.string(), en: z.string() });
export const microActionSchema = z.object({
  title: bilingual,
  effect: bilingual,
  howTo: bilingual,
  warning: bilingualOptional,
  labels: z.array(z.string()).min(1, 'Choose at least one label.'),
  durationMin: z.number().min(1).max(60),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  defaultFunctionTag: z.enum(['regulate', 'activate', 'build', 'recover']).nullable(),
});
export type MicroActionFormValues = z.infer<typeof microActionSchema>;
