import { z } from 'zod';
const bilingual = z.object({
  nl: z.string().min(1, 'Required'),
  en: z.string().min(1, 'Required'),
});
export const microActionSchema = z.object({
  title: bilingual,
  effect: bilingual,
  howTo: bilingual,
  warning: bilingual,
  labels: z.array(z.string()).min(1, 'Choose at least one label.'),
  durationMin: z.number().min(1).max(60),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  defaultFunctionTag: z.enum(['regulate', 'activate', 'build', 'recover']).nullable(),
});
export type MicroActionFormValues = z.infer<typeof microActionSchema>;
