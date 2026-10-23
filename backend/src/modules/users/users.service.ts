import { transaction } from '../../database/transaction.js';
import { AppError, notFound } from '../../shared/errors/app-error.js';
import { notify } from '../notifications/notifications.repository.js';
import * as repository from './users.repository.js';
import type { ProfileInput } from './users.validation.js';

export async function getProfile(id: string, viewerId: string | null) {
  const profile = await repository.findProfile(id, viewerId);
  if (!profile) notFound('Usuario');
  return profile;
}

export async function updateProfile(userId: string, input: ProfileInput) {
  await transaction(async (database) => {
    if (!(await repository.lockActiveUsers([userId], database))) notFound('Usuario');
    await repository.updateProfile(userId, input, database);
  });
  return getProfile(userId, userId);
}

export async function follow(userId: string, targetId: string) {
  if (userId === targetId) throw new AppError(400, 'SELF_FOLLOW', 'No podés seguirte a vos mismo.');
  await transaction(async (database) => {
    if (!(await repository.lockActiveUsers([userId, targetId], database))) notFound('Usuario');
    await repository.insertFollow(userId, targetId, database);
    await notify({ recipientId: targetId, actorId: userId, kind: 'follow' }, database);
  });
}

export async function unfollow(userId: string, targetId: string) {
  await repository.deleteFollow(userId, targetId);
}

export const listUsers = repository.listUsers;
