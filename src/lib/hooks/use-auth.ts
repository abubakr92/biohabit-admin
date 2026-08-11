'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession, login, logout } from '@/lib/api/auth';
export const useSession = () =>
  useQuery({ queryKey: ['session'], queryFn: getSession, retry: false });
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (user) => qc.setQueryData(['session'], user),
  });
}
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: logout, onSuccess: () => qc.clear() });
}
