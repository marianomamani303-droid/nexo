import { randomUUID } from 'node:crypto';
import type { Database } from '../../database/query.js';
import { transaction } from '../../database/transaction.js';
import { AppError, forbidden, notFound } from '../../shared/errors/app-error.js';
import * as repository from './communities.repository.js';
import type { CreateCommunityInput, UpdateCommunityInput } from './communities.validation.js';
import { findProfile } from '../users/users.repository.js';

export async function getCommunity(id: string, viewerId: string | null) {
  const community = await repository.findCommunity(id, viewerId);
  if (!community) notFound('Comunidad');
  return community;
}
async function lockedCommunity(id: string, database: Database) {
  const community = await repository.lockCommunity(id, database);
  if (!community) notFound('Comunidad');
  return community;
}
export async function createCommunity(userId: string, input: CreateCommunityInput) {
  const id = randomUUID();
  await transaction((database) => repository.insertCommunity(id, userId, input, database));
  return getCommunity(id, userId);
}
export async function updateCommunity(id: string, userId: string, input: UpdateCommunityInput) {
  await transaction(async (database) => {
    const community = await lockedCommunity(id, database);
    if (community.ownerId !== userId) forbidden();
    await repository.updateCommunity(id, input, database);
  });
  return getCommunity(id, userId);
}
export async function deleteCommunity(id: string, userId: string) {
  await transaction(async (database) => {
    const community = await lockedCommunity(id, database);
    if (community.ownerId !== userId) forbidden();
    await repository.deleteCommunity(id, database);
  });
}
export async function join(id: string, userId: string) {
  await transaction(async (database) => {
    const community = await lockedCommunity(id, database);
    const role = await repository.memberRole(id, userId, database);
    if (role) return;
    if (community.visibility === 'private') forbidden();
    await repository.setMember(id, userId, 'member', database);
  });
}
export async function setMember(
  id: string,
  actorId: string,
  userId: string,
  role: 'member' | 'moderator',
) {
  await transaction(async (database) => {
    const community = await lockedCommunity(id, database);
    const actorRole = await repository.memberRole(id, actorId, database);
    const targetRole = await repository.memberRole(id, userId, database);
    if (!actorRole || actorRole === 'member' || userId === community.ownerId) forbidden();
    if (actorRole === 'moderator' && (role !== 'member' || targetRole === 'moderator')) forbidden();
    if (!(await findProfile(userId, actorId, database))) notFound('Usuario');
    await repository.setMember(id, userId, role, database);
  });
}
export async function removeMember(id: string, actorId: string, userId: string) {
  await transaction(async (database) => {
    const community = await lockedCommunity(id, database);
    if (userId === community.ownerId)
      throw new AppError(409, 'OWNER_REQUIRED', 'El propietario no puede abandonar su comunidad.');
    if (actorId !== userId) {
      const actorRole = await repository.memberRole(id, actorId, database);
      const targetRole = await repository.memberRole(id, userId, database);
      if (
        !actorRole ||
        actorRole === 'member' ||
        (actorRole === 'moderator' && targetRole === 'moderator')
      )
        forbidden();
    }
    await repository.removeMember(id, userId, database);
  });
}
export const listCommunities = repository.listCommunities;
export const listMembers = repository.listMembers;
