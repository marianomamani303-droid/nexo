import { decodeCursor, pageOf, type PageQuery } from '../../shared/http/pagination.js';
import { postVisibility } from '../../shared/security/post-access.js';
import { createHash, randomUUID } from 'node:crypto';
import { execute, select, type SqlValue, type Database } from '../../database/query.js';

export interface NotificationInput {
  recipientId: string;
  actorId: string;
  kind: 'follow' | 'post_reaction' | 'comment_reaction' | 'comment' | 'reply' | 'message';
  postId?: string;
  commentId?: string;
  conversationId?: string;
  messageId?: string;
}

export async function notify(input: NotificationInput, database: Database) {
  if (input.recipientId === input.actorId) return;
  const target = input.commentId || input.messageId || input.postId || input.recipientId;
  const key = createHash('sha256')
    .update(`${input.kind}:${input.actorId}:${input.recipientId}:${target}`)
    .digest();
  await execute(
    `INSERT INTO notifications (id, recipient_id, actor_id, kind, post_id, comment_id, conversation_id, message_id, deduplication_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`,
    [
      randomUUID(),
      input.recipientId,
      input.actorId,
      input.kind,
      input.postId || null,
      input.commentId || null,
      input.conversationId || null,
      input.messageId || null,
      key,
    ],
    database,
  );
}

export async function listNotifications(userId: string, query: PageQuery & { unread?: boolean }) {
  const scope = `notifications:${userId}:${query.unread || false}`;
  const cursor = decodeCursor(query.cursor, scope);
  const access = postVisibility(userId);
  const where = [
    'n.recipient_id = ?',
    `(n.post_id IS NULL OR (${access.sql}))`,
    '(n.comment_id IS NULL OR EXISTS(SELECT 1 FROM comments c WHERE c.id = n.comment_id AND c.deleted_at IS NULL))',
    '(n.conversation_id IS NULL OR EXISTS(SELECT 1 FROM conversation_members m WHERE m.conversation_id = n.conversation_id AND m.user_id = ? AND m.left_at IS NULL))',
    '(n.message_id IS NULL OR EXISTS(SELECT 1 FROM messages m WHERE m.id = n.message_id AND m.deleted_at IS NULL))',
    "(n.community_id IS NULL OR EXISTS(SELECT 1 FROM communities c WHERE c.id = n.community_id AND c.deleted_at IS NULL AND (c.visibility = 'public' OR EXISTS(SELECT 1 FROM community_members member WHERE member.community_id = c.id AND member.user_id = ?))))",
  ];
  const values: SqlValue[] = [userId, ...access.values, userId, userId];
  if (query.unread) where.push('n.read_at IS NULL');
  if (cursor) {
    where.push('(n.created_at < ? OR (n.created_at = ? AND n.id < ?))');
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<{
    id: string;
    kind: string;
    actorId: string | null;
    actorName: string | null;
    actorHandle: string | null;
    postId: string | null;
    commentId: string | null;
    conversationId: string | null;
    messageId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>(
    `SELECT n.id, n.kind, actor.id AS actorId, profile.display_name AS actorName, actor.handle AS actorHandle,
    n.post_id AS postId, n.comment_id AS commentId, n.conversation_id AS conversationId, n.message_id AS messageId,
    n.read_at AS readAt, n.created_at AS createdAt FROM notifications n
    LEFT JOIN posts p ON p.id = n.post_id LEFT JOIN users actor ON actor.id = n.actor_id AND actor.status = 'active' AND actor.deleted_at IS NULL LEFT JOIN user_profiles profile ON profile.user_id = actor.id
    WHERE ${where.join(' AND ')} ORDER BY n.created_at DESC, n.id DESC LIMIT ?`,
    values,
  );
  return pageOf(rows, query.limit, scope);
}

export async function notificationExists(id: string, userId: string) {
  const rows = await select<{ id: string }>(
    'SELECT id FROM notifications WHERE id = ? AND recipient_id = ?',
    [id, userId],
  );
  return rows.length > 0;
}
export async function markRead(id: string, userId: string) {
  await execute(
    'UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3)) WHERE id = ? AND recipient_id = ?',
    [id, userId],
  );
}
export async function markAllRead(userId: string) {
  await execute(
    'UPDATE notifications SET read_at = UTC_TIMESTAMP(3) WHERE recipient_id = ? AND read_at IS NULL',
    [userId],
  );
}
