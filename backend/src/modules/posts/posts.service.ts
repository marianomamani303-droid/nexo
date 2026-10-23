import { randomUUID } from 'node:crypto';
import type { Database } from '../../database/query.js';
import { transaction } from '../../database/transaction.js';
import { AppError, forbidden, notFound } from '../../shared/errors/app-error.js';
import { notify } from '../notifications/notifications.repository.js';
import { lockCommunity, memberRole } from '../communities/communities.repository.js';
import * as repository from './posts.repository.js';
import type { CreatePostInput, UpdatePostInput } from './posts.validation.js';

export async function getPost(id: string, viewerId: string | null) {
  const post = await repository.findPost(id, viewerId);
  if (!post) notFound('Publicación');
  return post;
}

export async function requireReadablePost(
  id: string,
  viewerId: string | null,
  database?: Database,
  lock = false,
) {
  const post = await repository.readablePost(id, viewerId, database, lock);
  if (!post) notFound('Publicación');
  return post;
}

export async function createPost(authorId: string, input: CreatePostInput) {
  const id = randomUUID();
  await transaction(async (database) => {
    if (input.communityId) {
      const community = await lockCommunity(input.communityId, database);
      if (!community || !(await memberRole(input.communityId, authorId, database))) forbidden();
    }
    await repository.insertPost(id, authorId, input, database);
  });
  return getPost(id, authorId);
}

export async function updatePost(id: string, userId: string, input: UpdatePostInput) {
  await transaction(async (database) => {
    const post = await requireReadablePost(id, userId, database, true);
    if (post.authorId !== userId) forbidden();
    if (
      input.visibility &&
      (post.communityId ? input.visibility !== 'community' : input.visibility === 'community')
    )
      throw new AppError(
        400,
        'INVALID_VISIBILITY',
        'No se puede cambiar la comunidad de una publicación.',
      );
    await repository.updatePost(id, input, database);
  });
  return getPost(id, userId);
}

export async function deletePost(id: string, userId: string) {
  await transaction(async (database) => {
    const post = await requireReadablePost(id, userId, database, true);
    if (post.authorId !== userId) {
      if (!post.communityId) forbidden();
      const role = await memberRole(post.communityId, userId, database);
      if (role !== 'owner' && role !== 'moderator') forbidden();
    }
    await repository.deletePost(id, database);
  });
}

export async function react(id: string, userId: string, reaction: string | null) {
  await transaction(async (database) => {
    const post = await requireReadablePost(id, userId, database, true);
    await repository.setReaction(id, userId, reaction, database);
    if (reaction) {
      await notify(
        { recipientId: post.authorId, actorId: userId, kind: 'post_reaction', postId: id },
        database,
      );
    }
  });
}

export async function bookmark(id: string, userId: string, saved: boolean) {
  await transaction(async (database) => {
    await requireReadablePost(id, userId, database, true);
    await repository.setBookmark(id, userId, saved, database);
  });
}

export const listPosts = repository.listPosts;
