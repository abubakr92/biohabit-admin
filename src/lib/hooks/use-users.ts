'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers, unlockUser } from '@/lib/api/users';
export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: getUsers });
export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unlockUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
