import type { NotificationTemplate } from '@/types/models';

/**
 * Build 1 defines a single trigger, `series_anchor`. No Phase 2 trigger is seeded here — a
 * template that exists in the mock but not in the specification would read as a supported feature.
 */
export const seedNotificationTemplates: NotificationTemplate[] = [
  {
    id: 'notification-1',
    triggerKey: 'series_anchor',
    title: { nl: 'Tijd voor je reeks', en: 'Time for your series' },
    body: {
      nl: 'Je eerste actie staat klaar. Begin klein.',
      en: 'Your first action is ready. Start small.',
    },
    deeplinkTarget: 'biohabit://home',
    isActive: true,
    updatedAt: new Date(2026, 6, 20).toISOString(),
  },
];
