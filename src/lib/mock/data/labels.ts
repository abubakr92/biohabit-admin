import type { Label } from '@/types/models';

const names: Array<[string, string, string]> = [
  ['energy', 'Energie', 'Energy'],
  ['sleep', 'Slaap', 'Sleep'],
  ['gut', 'Darmen', 'Gut'],
  ['brain', 'Brein', 'Brain'],
  ['stress', 'Stress', 'Stress'],
  ['hormones', 'Hormonen', 'Hormones'],
  ['movement', 'Beweging', 'Movement'],
  ['skin', 'Huid', 'Skin'],
];
export const seedLabels: Label[] = names.map(([key, nl, en], index) => ({
  id: `label-${index + 1}`,
  key,
  name: { nl, en },
  usageCount: [8, 6, 3, 5, 9, 2, 6, 1][index],
}));
