'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMicroAction,
  deleteMicroAction,
  getMicroAction,
  getMicroActions,
  updateMicroAction,
  type MicroActionInput,
} from '@/lib/api/micro-actions';
export const actionKeys = {
  all: ['micro-actions'] as const,
  detail: (id: string) => ['micro-actions', id] as const,
};
export const useMicroActions = () =>
  useQuery({ queryKey: actionKeys.all, queryFn: getMicroActions });
export const useMicroAction = (id: string) =>
  useQuery({
    queryKey: actionKeys.detail(id),
    queryFn: () => getMicroAction(id),
    enabled: Boolean(id),
  });
export function useCreateMicroAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMicroAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: actionKeys.all }),
  });
}
export function useUpdateMicroAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MicroActionInput>) => updateMicroAction(id, input),
    onSuccess: (data) => {
      qc.setQueryData(actionKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: actionKeys.all });
    },
  });
}
export function useDeleteMicroAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMicroAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: actionKeys.all }),
  });
}
