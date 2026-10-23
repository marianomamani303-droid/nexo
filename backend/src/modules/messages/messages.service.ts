import { randomUUID } from 'node:crypto';
import type { Database } from '../../database/query.js';
import { lockActiveUsers } from '../users/users.repository.js';
import { transaction } from '../../database/transaction.js';
import { AppError, forbidden, notFound } from '../../shared/errors/app-error.js';
import type { PageQuery } from '../../shared/http/pagination.js';
import { notify } from '../notifications/notifications.repository.js';
import * as repository from './messages.repository.js';
import type { SendMessageInput } from './messages.validation.js';

async function requireConversation(id: string, userId: string, database?: Database, lock = false) {
  const conversation = await repository.findConversation(id, userId, database, lock);
  if (!conversation) notFound('Conversación');
  return conversation;
}
async function requireMessage(id: string, database?: Database, lock = false) {
  const message = await repository.findMessage(id, database, lock);
  if (!message) notFound('Mensaje');
  return message;
}
export async function createDirect(userId: string, targetId: string) {
  if (userId === targetId)
    throw new AppError(400, 'SELF_CONVERSATION', 'Elegí otra persona para conversar.');
  const [low, high] = [userId, targetId].sort();
  return transaction(async (database) => {
    // Lock both users in a deterministic order to serialize concurrent direct-conversation creation.
    if (!(await lockActiveUsers([low, high], database))) notFound('Usuario');
    const existing = await repository.findDirect(low, high, database);
    if (existing) {
      await requireConversation(existing.id, userId, database);
      return existing;
    }
    const id = randomUUID();
    await repository.insertDirect(id, userId, low, high, database);
    return requireConversation(id, userId, database);
  });
}
export async function sendMessage(conversationId: string, userId: string, input: SendMessageInput) {
  const id = randomUUID();
  await transaction(async (database) => {
    await requireConversation(conversationId, userId, database, true);
    const recipient = await repository.findActiveRecipient(conversationId, userId, database);
    if (!recipient)
      throw new AppError(409, 'RECIPIENT_UNAVAILABLE', 'El destinatario no está disponible.');
    if (input.replyToId) {
      const parent = await requireMessage(input.replyToId, database);
      if (parent.conversationId !== conversationId)
        throw new AppError(
          400,
          'INVALID_REPLY',
          'La respuesta debe pertenecer a la misma conversación.',
        );
    }
    await repository.insertMessage(
      id,
      conversationId,
      userId,
      input.content,
      input.replyToId,
      database,
    );
    await notify(
      {
        recipientId: recipient.id,
        actorId: userId,
        kind: 'message',
        conversationId,
        messageId: id,
      },
      database,
    );
  });
  return requireMessage(id);
}
export async function listMessages(id: string, userId: string, query: PageQuery) {
  await requireConversation(id, userId);
  return repository.listMessages(id, userId, query);
}
export async function updateMessage(id: string, userId: string, content: string) {
  const snapshot = await requireMessage(id);
  await transaction(async (database) => {
    await requireConversation(snapshot.conversationId, userId, database, true);
    const message = await requireMessage(id, database, true);
    if (message.senderId !== userId) forbidden();
    await repository.updateMessage(id, content, database);
  });
  return requireMessage(id);
}
export async function deleteMessage(id: string, userId: string) {
  const snapshot = await requireMessage(id);
  await transaction(async (database) => {
    await requireConversation(snapshot.conversationId, userId, database, true);
    const message = await requireMessage(id, database, true);
    if (message.senderId !== userId) forbidden();
    await repository.deleteMessage(id, database);
  });
}
export async function markRead(id: string, userId: string) {
  await transaction(async (database) => {
    await requireConversation(id, userId, database, true);
    await repository.markRead(id, userId, database);
  });
}
export const listConversations = repository.listConversations;
