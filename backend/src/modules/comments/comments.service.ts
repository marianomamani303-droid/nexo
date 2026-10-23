import { randomUUID } from 'node:crypto';
import type { Database } from '../../database/query.js';
import { transaction } from '../../database/transaction.js';
import { AppError, forbidden, notFound } from '../../shared/errors/app-error.js';
import type { PageQuery } from '../../shared/http/pagination.js';
import { requireReadablePost } from '../posts/posts.service.js';
import { notify } from '../notifications/notifications.repository.js';
import * as repository from './comments.repository.js';
import type { CreateCommentInput } from './comments.validation.js';

async function requireComment(id: string, database?: Database, lock = false) {
  const comment = await repository.findComment(id, database, lock);
  if (!comment) notFound('Comentario');
  return comment;
}
export async function listComments(postId: string, viewerId: string | null, query: PageQuery) {
  await requireReadablePost(postId, viewerId);
  return repository.listComments(postId, viewerId, query);
}
export async function createComment(postId: string, userId: string, input: CreateCommentInput) {
  const id = randomUUID();
  await transaction(async (database) => {
    const post = await requireReadablePost(postId, userId, database, true);
    const parent = input.parentId ? await requireComment(input.parentId, database, true) : null;
    if (parent && parent.postId !== postId)
      throw new AppError(
        400,
        'INVALID_PARENT',
        'La respuesta debe pertenecer a la misma publicación.',
      );
    await repository.insertComment({ id, postId, userId, ...input }, database);
    await notify(
      { recipientId: post.authorId, actorId: userId, kind: 'comment', postId, commentId: id },
      database,
    );
    if (parent && parent.authorId !== post.authorId)
      await notify(
        { recipientId: parent.authorId, actorId: userId, kind: 'reply', postId, commentId: id },
        database,
      );
  });
  return requireComment(id);
}
export async function updateComment(id: string, userId: string, content: string) {
  const snapshot = await requireComment(id);
  await transaction(async (database) => {
    await requireReadablePost(snapshot.postId, userId, database, true);
    const comment = await requireComment(id, database, true);
    if (comment.authorId !== userId) forbidden();
    await repository.updateComment(id, content, database);
  });
  return requireComment(id);
}
export async function deleteComment(id: string, userId: string) {
  const snapshot = await requireComment(id);
  await transaction(async (database) => {
    const post = await requireReadablePost(snapshot.postId, userId, database, true);
    const comment = await requireComment(id, database, true);
    if (comment.authorId !== userId && post.authorId !== userId) forbidden();
    await repository.deleteComment(id, database);
  });
}
export async function react(id: string, userId: string, reaction: string | null) {
  const snapshot = await requireComment(id);
  await transaction(async (database) => {
    await requireReadablePost(snapshot.postId, userId, database, true);
    const comment = await requireComment(id, database, true);
    await repository.setReaction(id, userId, reaction, database);
    if (reaction)
      await notify(
        {
          recipientId: comment.authorId,
          actorId: userId,
          kind: 'comment_reaction',
          postId: comment.postId,
          commentId: id,
        },
        database,
      );
  });
}
