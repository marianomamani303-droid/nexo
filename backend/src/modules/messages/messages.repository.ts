import {
  execute,
  select,
  type Database,
  type SqlValue,
  type SqlCount,
} from '../../database/query.js';
import { decodeCursor, pageOf, type PageQuery } from '../../shared/http/pagination.js';

export interface ConversationRecord {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  replyToId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function findDirect(low: string, high: string, database: Database) {
  const rows = await select<ConversationRecord>(
    'SELECT id, kind, title, created_at AS createdAt, updated_at AS updatedAt FROM conversations WHERE direct_user_low = ? AND direct_user_high = ?',
    [low, high],
    database,
  );
  return rows[0] || null;
}
export async function insertDirect(
  id: string,
  creatorId: string,
  low: string,
  high: string,
  database: Database,
) {
  await execute(
    "INSERT INTO conversations (id, kind, created_by, direct_user_low, direct_user_high) VALUES (?, 'direct', ?, ?, ?)",
    [id, creatorId, low, high],
    database,
  );
  await execute(
    "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')",
    [id, low, id, high],
    database,
  );
}
export async function findConversation(
  id: string,
  userId: string,
  database?: Database,
  lock = false,
) {
  const rows = await select<ConversationRecord>(
    `SELECT c.id, c.kind, c.title, c.created_at AS createdAt, c.updated_at AS updatedAt FROM conversations c JOIN conversation_members m ON m.conversation_id = c.id AND m.user_id = ? AND m.left_at IS NULL WHERE c.id = ? AND c.kind = 'direct'${lock ? ' FOR UPDATE' : ''}`,
    [userId, id],
    database,
  );
  return rows[0] || null;
}
export async function findActiveRecipient(id: string, senderId: string, database: Database) {
  const rows = await select<{ id: string }>(
    "SELECT u.id FROM conversation_members m JOIN users u ON u.id = m.user_id WHERE m.conversation_id = ? AND m.user_id <> ? AND m.left_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL",
    [id, senderId],
    database,
  );
  return rows[0] || null;
}
export async function findMessage(id: string, database?: Database, lock = false) {
  const rows = await select<MessageRecord>(
    `SELECT id, conversation_id AS conversationId, sender_id AS senderId, content, reply_to_message_id AS replyToId, created_at AS createdAt, updated_at AS updatedAt FROM messages WHERE id = ? AND deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`,
    [id],
    database,
  );
  return rows[0] || null;
}
export async function insertMessage(
  id: string,
  conversationId: string,
  senderId: string,
  content: string,
  replyToId: string | undefined,
  database: Database,
) {
  // Millisecond timestamps must advance past the read watermark even for sends in the same millisecond.
  await execute(
    `INSERT INTO messages (id, conversation_id, sender_id, content, reply_to_message_id, created_at)
    VALUES (?, ?, ?, ?, ?, GREATEST(UTC_TIMESTAMP(3), COALESCE((SELECT MAX(last_read_at) FROM conversation_members WHERE conversation_id = ?), '1970-01-01') + INTERVAL 1000 MICROSECOND))`,
    [id, conversationId, senderId, content, replyToId || null, conversationId],
    database,
  );
  await execute(
    'UPDATE conversations SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?',
    [conversationId],
    database,
  );
}
export async function updateMessage(id: string, content: string, database: Database) {
  await execute('UPDATE messages SET content = ? WHERE id = ?', [content, id], database);
}
export async function deleteMessage(id: string, database: Database) {
  await execute('UPDATE messages SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?', [id], database);
}
export async function markRead(id: string, userId: string, database: Database) {
  await execute(
    `UPDATE conversation_members SET last_read_at = GREATEST(UTC_TIMESTAMP(3), COALESCE((SELECT MAX(created_at) FROM messages WHERE conversation_id = ?), UTC_TIMESTAMP(3))) WHERE conversation_id = ? AND user_id = ?`,
    [id, id, userId],
    database,
  );
  await execute(
    'UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3)) WHERE conversation_id = ? AND recipient_id = ?',
    [id, userId],
    database,
  );
}

export async function listConversations(userId: string, query: PageQuery) {
  // Creation order keeps pagination stable while new messages update the conversation.
  const scope = `conversations:${userId}`;
  const cursor = decodeCursor(query.cursor, scope);
  const values: SqlValue[] = [userId, userId, userId];
  let condition = '';
  if (cursor) {
    condition = 'AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))';
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<
    ConversationRecord & {
      participantId: string;
      participantName: string;
      participantHandle: string;
      unreadCount: SqlCount;
      lastReadAt: Date | null;
    }
  >(
    `SELECT c.id, c.kind, c.title, c.created_at AS createdAt, c.updated_at AS updatedAt,
      other.user_id AS participantId, p.display_name AS participantName, u.handle AS participantHandle, mine.last_read_at AS lastReadAt,
      (SELECT COUNT(*) FROM messages message WHERE message.conversation_id = c.id AND message.sender_id <> ? AND message.deleted_at IS NULL AND (mine.last_read_at IS NULL OR message.created_at > mine.last_read_at)) AS unreadCount
     FROM conversations c JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = ? AND mine.left_at IS NULL
     JOIN conversation_members other ON other.conversation_id = c.id AND other.user_id <> ? AND other.left_at IS NULL
     JOIN users u ON u.id = other.user_id JOIN user_profiles p ON p.user_id = u.id
     WHERE c.kind = 'direct' ${condition} ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
    values,
  );
  return pageOf(
    rows.map((row) => ({ ...row, unreadCount: Number(row.unreadCount) })),
    query.limit,
    scope,
  );
}
export async function listMessages(id: string, userId: string, query: PageQuery) {
  const scope = `messages:${id}:${userId}`;
  const cursor = decodeCursor(query.cursor, scope);
  const values: SqlValue[] = [id, userId];
  let condition = '';
  if (cursor) {
    condition = 'AND (created_at < ? OR (created_at = ? AND id < ?))';
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<MessageRecord>(
    `SELECT id, conversation_id AS conversationId, sender_id AS senderId, content, reply_to_message_id AS replyToId, created_at AS createdAt, updated_at AS updatedAt FROM messages WHERE conversation_id = ? AND EXISTS(SELECT 1 FROM conversation_members m WHERE m.conversation_id = messages.conversation_id AND m.user_id = ? AND m.left_at IS NULL) AND deleted_at IS NULL ${condition} ORDER BY created_at DESC, id DESC LIMIT ?`,
    values,
  );
  return pageOf(rows, query.limit, scope);
}
