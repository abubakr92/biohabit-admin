'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStack,
  deleteStack,
  duplicateStack,
  getStack,
  getStacks,
  updateStack,
  type StackInput,
} from '@/lib/api/stacks';
export const stackKeys = {
  all: ['stacks'] as const,
  detail: (id: string) => ['stacks', id] as const,
};
export const useStacks = () => useQuery({ queryKey: stackKeys.all, queryFn: getStacks });
export const useStack = (id: string) =>
  useQuery({ queryKey: stackKeys.detail(id), queryFn: () => getStack(id), enabled: Boolean(id) });
export function useCreateStack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStack,
    onSuccess: () => qc.invalidateQueries({ queryKey: stackKeys.all }),
  });
}
export function useUpdateStack(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<StackInput>) => updateStack(id, input),
    onSuccess: (data) => {
      qc.setQueryData(stackKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: stackKeys.all });
    },
  });
}
export function useDuplicateStack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: duplicateStack,
    onSuccess: () => qc.invalidateQueries({ queryKey: stackKeys.all }),
  });
}
export function useDeleteStack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStack,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: stackKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stackKeys.all });
    },
  });
}
