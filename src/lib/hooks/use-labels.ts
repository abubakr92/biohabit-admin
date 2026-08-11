'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLabel, deleteLabel, getLabels, updateLabel } from '@/lib/api/labels';
import type { Label } from '@/types/models';
export const useLabels = () => useQuery({ queryKey: ['labels'], queryFn: getLabels });
export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLabel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}
export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Pick<Label, 'key' | 'name'>> }) =>
      updateLabel(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}
export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}
