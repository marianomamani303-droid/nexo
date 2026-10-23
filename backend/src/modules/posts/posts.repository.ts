import {
  execute,
  select,
  type Database,
  type SqlValue,
  type SqlCount,
} from '../../database/query.js';
import { decodeCursor, pageOf } from '../../shared/http/pagination.js';
import { postVisibility } from '../../shared/security/post-access.js';
import type { CreatePostInput, PostsQuery, UpdatePostInput } from './posts.validation.js';

export interface PostRecord {
  id: string;
  authorId: string;
  communityId: string | null;
  content: string | null;
  category: string | null;
  visibility: 'public' | 'followers' | 'community';
  createdAt: Date;
  updatedAt: Date;
}
interface PostRow extends PostRecord {
  authorName: string;
  authorHandle: string;
  reactionsCount: SqlCount;
  commentsCount: SqlCount;
  viewerReaction: string | null;
  bookmarked: 0 | 1;
}
function toPost(row: PostRow) {
  const { authorName, authorHandle, reactionsCount, commentsCount, bookmarked, ...post } = row;
  return {
    ...post,
    author: { id: row.authorId, name: authorName, handle: authorHandle },
    reactionsCount: Number(reactionsCount),
    commentsCount: Number(commentsCount),
    bookmarked: Boolean(bookmarked),
  };
}

const columns = `p.id, p.author_id AS authorId, p.community_id AS communityId, p.content, p.category, p.visibility,
  p.created_at AS createdAt, p.updated_at AS updatedAt, profile.display_name AS authorName, author.handle AS authorHandle,
  (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id) AS reactionsCount,
  (SELECT COUNT(*) FROM comments comment JOIN users commenter ON commenter.id = comment.author_id WHERE comment.post_id = p.id AND comment.deleted_at IS NULL AND commenter.status = 'active' AND commenter.deleted_at IS NULL) AS commentsCount,
  (SELECT reaction FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS viewerReaction,
  EXISTS(SELECT 1 FROM post_bookmarks bookmark WHERE bookmark.post_id = p.id AND bookmark.user_id = ?) AS bookmarked`;
const joins =
  'JOIN users author ON author.id = p.author_id JOIN user_profiles profile ON profile.user_id = p.author_id';

export async function findPost(id: string, viewerId: string | null) {
  const access = postVisibility(viewerId);
  const rows = await select<PostRow>(
    `SELECT ${columns} FROM posts p ${joins} WHERE p.id = ? AND ${access.sql}`,
    [viewerId, viewerId, id, ...access.values],
  );
  return rows[0] ? toPost(rows[0]) : null;
}

export async function readablePost(
  id: string,
  viewerId: string | null,
  database?: Database,
  lock = false,
) {
  const access = postVisibility(viewerId);
  const rows = await select<PostRecord>(
    `SELECT p.id, p.author_id AS authorId, p.community_id AS communityId, p.content, p.category, p.visibility, p.created_at AS createdAt, p.updated_at AS updatedAt FROM posts p WHERE p.id = ? AND ${access.sql}${lock ? ' FOR UPDATE' : ''}`,
    [id, ...access.values],
    database,
  );
  return rows[0] || null;
}

export async function listPosts(
  query: PostsQuery,
  viewerId: string | null,
  mode: 'all' | 'following' | 'bookmarks' = 'all',
) {
  const scope = `posts:${mode}:${viewerId || ''}:${JSON.stringify([query.q, query.authorId, query.communityId, query.category])}`;
  const cursor = decodeCursor(query.cursor, scope);
  const access = postVisibility(viewerId);
  const where = [access.sql];
  const values: SqlValue[] = [viewerId, viewerId, ...access.values];
  if (query.authorId) {
    where.push('p.author_id = ?');
    values.push(query.authorId);
  }
  if (query.communityId) {
    where.push('p.community_id = ?');
    values.push(query.communityId);
  }
  if (query.category) {
    where.push('p.category = ?');
    values.push(query.category);
  }
  if (query.q) {
    where.push('LOCATE(?, p.content) > 0');
    values.push(query.q);
  }
  if (mode === 'following') {
    where.push(
      '(p.author_id = ? OR EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id = ? AND f.followed_id = p.author_id) OR EXISTS(SELECT 1 FROM community_members m WHERE m.user_id = ? AND m.community_id = p.community_id))',
    );
    values.push(viewerId, viewerId, viewerId);
  }
  if (mode === 'bookmarks') {
    where.push('EXISTS(SELECT 1 FROM post_bookmarks b WHERE b.post_id = p.id AND b.user_id = ?)');
    values.push(viewerId);
  }
  if (cursor) {
    where.push('(p.created_at < ? OR (p.created_at = ? AND p.id < ?))');
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<PostRow>(
    `SELECT ${columns} FROM posts p ${joins} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
    values,
  );
  return pageOf(rows.map(toPost), query.limit, scope);
}

export async function insertPost(
  id: string,
  authorId: string,
  input: CreatePostInput,
  database: Database,
) {
  await execute(
    'INSERT INTO posts (id, author_id, community_id, content, category, visibility) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      authorId,
      input.communityId || null,
      input.content,
      input.category || null,
      input.communityId ? 'community' : input.visibility || 'public',
    ],
    database,
  );
}

export async function updatePost(id: string, input: UpdatePostInput, database: Database) {
  const fields: string[] = [];
  const values: SqlValue[] = [];
  for (const [column, value] of [
    ['content', input.content],
    ['category', input.category],
    ['visibility', input.visibility],
  ] as const) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }
  await execute(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, [...values, id], database);
}

export async function deletePost(id: string, database: Database) {
  await execute('UPDATE posts SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?', [id], database);
}
export async function setReaction(
  id: string,
  userId: string,
  reaction: string | null,
  database: Database,
) {
  if (reaction === null)
    await execute(
      'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?',
      [id, userId],
      database,
    );
  else
    await execute(
      'INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)',
      [id, userId, reaction],
      database,
    );
}
export async function setBookmark(id: string, userId: string, saved: boolean, database: Database) {
  if (saved)
    await execute(
      'INSERT INTO post_bookmarks (user_id, post_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = user_id',
      [userId, id],
      database,
    );
  else
    await execute(
      'DELETE FROM post_bookmarks WHERE user_id = ? AND post_id = ?',
      [userId, id],
      database,
    );
}
