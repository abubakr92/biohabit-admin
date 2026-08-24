'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUser,
  getUserActivity,
  getUserCheckOffs,
  getUserPreferences,
  getUserRoutines,
  getUsers,
  unlockUser,
  USER_ACTIVITY_DAYS,
} from '@/lib/api/users';
import type { UserStatus } from '@/types/api';

export const useUsers = (status: UserStatus) =>
  useInfiniteQuery({
    queryKey: ['users', status],
    queryFn: ({ pageParam }) => getUsers({ status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unlockUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export const userKeys = {
  detail: (id: string) => ['users', id] as const,
  routines: (id: string) => ['users', id, 'routines'] as const,
  activity: (id: string, days: number) => ['users', id, 'activity', days] as const,
  checkOffs: (id: string) => ['users', id, 'check-offs'] as const,
};

export const useUser = (id: string) =>
  useQuery({ queryKey: userKeys.detail(id), queryFn: () => getUser(id), enabled: Boolean(id) });

export const useUserRoutines = (id: string) =>
  useQuery({
    queryKey: userKeys.routines(id),
    queryFn: () => getUserRoutines(id),
    enabled: Boolean(id),
  });

export const useUserActivity = (id: string, days: number = USER_ACTIVITY_DAYS) =>
  useQuery({
    queryKey: userKeys.activity(id, days),
    queryFn: () => getUserActivity(id, days),
    enabled: Boolean(id),
  });

export const useUserCheckOffs = (id: string) =>
  useInfiniteQuery({
    queryKey: userKeys.checkOffs(id),
    queryFn: ({ pageParam }) => getUserCheckOffs({ id, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(id),
  });

export const useUserPreferences = (id: string) =>
  useQuery({
    queryKey: ['users', id, 'preferences'],
    queryFn: () => getUserPreferences(id),
    enabled: Boolean(id),
  });
