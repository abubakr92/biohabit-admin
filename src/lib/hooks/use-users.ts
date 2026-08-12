'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, unlockUser } from '@/lib/api/users';
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
