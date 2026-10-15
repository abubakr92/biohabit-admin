'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMoments, updateMoment, type MomentInput } from '@/lib/api/moments';
import type { MomentKey } from '@/types/models';
export const useMoments = () => useQuery({ queryKey: ['moments'], queryFn: getMoments });
export function useUpdateMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, input }: { key: MomentKey; input: MomentInput }) =>
      updateMoment(key, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moments'] }),
  });
}
