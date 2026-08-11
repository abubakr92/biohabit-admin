'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContextRow,
  deleteContextRow,
  getContextRows,
  reorderContextRows,
  updateContextRow,
  type ContextInput,
} from '@/lib/api/context-rows';
export const contextKeys = { stack: (id: string) => ['context-rows', id] as const };
export const useContextRows = (stackId: string) =>
  useQuery({
    queryKey: contextKeys.stack(stackId),
    queryFn: () => getContextRows(stackId),
    enabled: Boolean(stackId),
  });
export function useCreateContextRow(stackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContextInput) => createContextRow(stackId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.stack(stackId) });
      qc.invalidateQueries({ queryKey: ['stacks'] });
    },
  });
}
export function useUpdateContextRow(stackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ContextInput> }) =>
      updateContextRow(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.stack(stackId) });
      qc.invalidateQueries({ queryKey: ['stacks'] });
    },
  });
}
export function useDeleteContextRow(stackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContextRow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.stack(stackId) });
      qc.invalidateQueries({ queryKey: ['stacks'] });
    },
  });
}
export function useReorderContextRows(stackId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderContextRows(stackId, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.stack(stackId) }),
  });
}
