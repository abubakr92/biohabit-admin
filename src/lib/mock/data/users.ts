import type { AccessLevel, AppUser } from '@/types/models';

const levels: AccessLevel[] = ['test', 'free', 'premium', 'test', 'premium'];
export const seedUsers: AppUser[] = Array.from({ length: 15 }, (_, index) => ({
  id: `user-${index + 1}`,
  email: `tester${String(index + 1).padStart(2, '0')}@example.com`,
  accessLevel: levels[index % levels.length],
  rhythmDaysCount: (index * 3) % 8,
  unlockedAt: index % 3 === 0 ? new Date(2026, 6, 1 + index).toISOString() : null,
  lastCheckOffAt:
    index % 5 === 0 ? null : new Date(Date.now() - (index % 6) * 86_400_000).toISOString(),
  createdAt: new Date(2026, 2, index + 1).toISOString(),
}));
