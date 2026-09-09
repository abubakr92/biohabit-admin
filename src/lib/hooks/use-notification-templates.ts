'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplates,
  updateNotificationTemplate,
} from '@/lib/api/notification-templates';
import type { NotificationTemplateFormValues } from '@/lib/validation/notification-template';

const key = ['notification-templates'];

export const useNotificationTemplates = () =>
  useQuery({ queryKey: key, queryFn: getNotificationTemplates });

export function useCreateNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNotificationTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NotificationTemplateFormValues> }) =>
      updateNotificationTemplate(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNotificationTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
