import { notFound } from '../../shared/errors/app-error.js';
import * as repository from './notifications.repository.js';

export async function markRead(id: string, userId: string) {
  if (!(await repository.notificationExists(id, userId))) notFound('Notification');
  await repository.markRead(id, userId);
}
export const listNotifications = repository.listNotifications;
export const markAllRead = repository.markAllRead;
