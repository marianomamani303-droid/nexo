import {
  execute,
  select,
  type Database,
  type SqlValue,
  type SqlCount,
} from '../../database/query.js';
import { postVisibility } from '../../shared/security/post-access.js';
import { decodeCursor, pageOf, type PageQuery } from '../../shared/http/pagination.js';

export interface CommentRecord {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
interface CommentRow extends CommentRecord {
  authorName: string;
  authorHandle: string;
  reactionsCount: SqlCount;
  viewerReaction: string | null;
}

export async function findComment(id: string, database?: Database, lock = false) {
  const rows = await select<CommentRecord>(
    `SELECT id, post_id AS postId, author_id AS authorId, parent_comment_id AS parentId, content, created_at AS createdAt, updated_at AS updatedAt FROM comments WHERE id = ? AND deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`,
    [id],
    database,
  );
  return rows[0] || null;
}

export async function listComments(postId: string, viewerId: string | null, query: PageQuery) {
  const scope = `comments:${postId}:${viewerId || ''}`;
  const cursor = decodeCursor(query.cursor, scope);
  const access = postVisibility(viewerId);
  const values: SqlValue[] = [viewerId, postId, ...access.values];
  let condition = '';
  if (cursor) {
    condition = 'AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))';
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<CommentRow>(
    `SELECT c.id, c.post_id AS postId, c.author_id AS authorId, c.parent_comment_id AS parentId, c.content, c.created_at AS createdAt, c.updated_at AS updatedAt,
    profile.display_name AS authorName, u.handle AS authorHandle,
    (SELECT COUNT(*) FROM comment_reactions r WHERE r.comment_id = c.id) AS reactionsCount,
    (SELECT reaction FROM comment_reactions r WHERE r.comment_id = c.id AND r.user_id = ?) AS viewerReaction
    FROM comments c JOIN users u ON u.id = c.author_id JOIN user_profiles profile ON profile.user_id = c.author_id JOIN posts p ON p.id = c.post_id
    WHERE c.post_id = ? AND ${access.sql} AND c.deleted_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL ${condition}
    ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
    values,
  );
  return pageOf(
    rows.map(({ authorName, authorHandle, reactionsCount, ...row }) => ({
      ...row,
      author: { id: row.authorId, name: authorName, handle: authorHandle },
      reactionsCount: Number(reactionsCount),
    })),
    query.limit,
    scope,
  );
}

export async function insertComment(
  comment: { id: string; postId: string; userId: string; parentId?: string; content: string },
  database: Database,
) {
  await execute(
    'INSERT INTO comments (id, post_id, author_id, parent_comment_id, content) VALUES (?, ?, ?, ?, ?)',
    [comment.id, comment.postId, comment.userId, comment.parentId || null, comment.content],
    database,
  );
}
export async function updateComment(id: string, content: string, database: Database) {
  await execute('UPDATE comments SET content = ? WHERE id = ?', [content, id], database);
}
export async function deleteComment(id: string, database: Database) {
  await execute('UPDATE comments SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?', [id], database);
}
export async function setReaction(
  id: string,
  userId: string,
  reaction: string | null,
  database: Database,
) {
  if (reaction === null)
    await execute(
      'DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ?',
      [id, userId],
      database,
    );
  else
    await execute(
      'INSERT INTO comment_reactions (comment_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)',
      [id, userId, reaction],
      database,
    );
}
