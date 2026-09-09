import { apiRequest } from './client';
import { endpoints } from './endpoints';
import type { NotificationTemplate } from '@/types/models';
import type { NotificationTemplateFormValues } from '@/lib/validation/notification-template';

export const getNotificationTemplates = () =>
  apiRequest<NotificationTemplate[]>(endpoints.notificationTemplates.list);
export const createNotificationTemplate = (input: NotificationTemplateFormValues) =>
  apiRequest<NotificationTemplate>(endpoints.notificationTemplates.list, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateNotificationTemplate = (
  id: string,
  input: Partial<NotificationTemplateFormValues>,
) =>
  apiRequest<NotificationTemplate>(endpoints.notificationTemplates.detail(id), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const deleteNotificationTemplate = (id: string) =>
  apiRequest<void>(endpoints.notificationTemplates.detail(id), { method: 'DELETE' });
