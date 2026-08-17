import type { Stack } from '@/types/models';

const items = [
  ['Rustige start', 'Calm morning', 'regulate', 'stress'],
  ['Heldere energie', 'Clear energy', 'activate', 'energy'],
  ['Focusfundament', 'Focus foundation', 'build', 'brain'],
  ['Avond landing', 'Evening landing', 'recover', 'sleep'],
  ['Darmritme', 'Gut rhythm', 'regulate', 'gut'],
  ['Beweegpauze', 'Movement reset', 'activate', 'movement'],
  ['Veerkracht bouwen', 'Build resilience', 'build', 'stress'],
  ['Diepe rust', 'Deep recovery', 'recover', 'sleep'],
] as const;

export const seedStacks: Stack[] = items.map(([nl, en, functionTag, primaryLabel], index) => ({
  id: `stack-${index + 1}`,
  title: { nl, en },
  description: {
    nl: `Een praktische routine voor ${nl.toLowerCase()}.`,
    en: `A practical routine for ${en.toLowerCase()}.`,
  },
  coherence: {
    nl: 'Kleine acties bouwen samen een stabiel ritme.',
    en: 'Small actions combine into a steady rhythm.',
  },
  suggestedTiming: {
    nl: index % 3 === 2 ? 'In de avond' : index % 3 === 1 ? 'Rond de middag' : 'Na het opstaan',
    en: index % 3 === 2 ? 'In the evening' : index % 3 === 1 ? 'Around midday' : 'After waking',
  },
  functionTag,
  primaryLabel,
  supportingLabels: index % 2 ? ['brain'] : ['energy'],
  level: index > 5 ? 'balanced' : 'essential',
  daypart: index % 3 === 2 ? 'evening' : index % 3 === 1 ? 'midday' : 'morning',
  isPremium: index > 4,
  isActive: index !== 6,
  actionCount: 4,
  modeDurations: { essential: 5 + (index % 2), balanced: 12 + (index % 3), full: 24 + index },
  createdAt: new Date(2026, 0, index + 2).toISOString(),
  updatedAt: new Date(2026, 6, 28 - index).toISOString(),
}));
