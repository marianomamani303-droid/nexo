import {
  select,
  execute,
  type Database,
  type SqlValue,
  type SqlCount,
} from '../../database/query.js';
import { decodeCursor, pageOf, type PageQuery } from '../../shared/http/pagination.js';
import type { ProfileInput } from './users.validation.js';

export interface PublicUser {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  createdAt: Date;
  followersCount: number;
  followingCount: number;
  followed: boolean;
}

const userColumns = `u.id, u.handle, p.display_name AS name, p.bio, p.location, p.website, u.created_at AS createdAt,
  (SELECT COUNT(*) FROM user_follows f JOIN users follower ON follower.id = f.follower_id WHERE f.followed_id = u.id AND follower.status = 'active' AND follower.deleted_at IS NULL) AS followersCount,
  (SELECT COUNT(*) FROM user_follows f JOIN users followed ON followed.id = f.followed_id WHERE f.follower_id = u.id AND followed.status = 'active' AND followed.deleted_at IS NULL) AS followingCount,
  EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id = ? AND f.followed_id = u.id) AS followed`;

interface UserRow extends Omit<PublicUser, 'followersCount' | 'followingCount' | 'followed'> {
  followersCount: SqlCount;
  followingCount: SqlCount;
  followed: 0 | 1;
}
function publicUser(row: UserRow): PublicUser {
  return {
    ...row,
    followed: Boolean(row.followed),
    followersCount: Number(row.followersCount),
    followingCount: Number(row.followingCount),
  };
}

export async function lockActiveUsers(ids: string[], database: Database) {
  for (const id of [...new Set(ids)].sort()) {
    const rows = await select<{ id: string }>(
      "SELECT id FROM users WHERE id = ? AND status = 'active' AND deleted_at IS NULL FOR UPDATE",
      [id],
      database,
    );
    if (!rows.length) return false;
  }
  return true;
}

export async function insertFollow(userId: string, targetId: string, database: Database) {
  await execute(
    'INSERT INTO user_follows (follower_id, followed_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE follower_id = follower_id',
    [userId, targetId],
    database,
  );
}

export async function deleteFollow(userId: string, targetId: string) {
  await execute('DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ?', [
    userId,
    targetId,
  ]);
}

export async function findProfile(id: string, viewerId: string | null, database?: Database) {
  const rows = await select<UserRow>(
    `SELECT ${userColumns} FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ? AND u.status = 'active' AND u.deleted_at IS NULL`,
    [viewerId, id],
    database,
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

export async function listUsers(
  query: PageQuery & { q?: string },
  viewerId: string | null,
  relation?: { userId: string; kind: 'followers' | 'following' },
) {
  const scope = `users:${relation?.kind || 'all'}:${relation?.userId || ''}:${query.q || ''}`;
  const cursor = decodeCursor(query.cursor, scope);
  const where = ["u.status = 'active'", 'u.deleted_at IS NULL'];
  const values: SqlValue[] = [viewerId];
  if (relation) {
    const column = relation.kind === 'followers' ? 'followed_id' : 'follower_id';
    const otherColumn = relation.kind === 'followers' ? 'follower_id' : 'followed_id';
    where.push(
      `EXISTS(SELECT 1 FROM user_follows f WHERE f.${column} = ? AND f.${otherColumn} = u.id)`,
    );
    values.push(relation.userId);
  }
  if (query.q) {
    where.push('(LOCATE(?, p.display_name) > 0 OR LOCATE(?, u.handle) > 0)');
    values.push(query.q, query.q);
  }
  if (cursor) {
    where.push('(u.created_at < ? OR (u.created_at = ? AND u.id < ?))');
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<UserRow>(
    `SELECT ${userColumns} FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC, u.id DESC LIMIT ?`,
    values,
  );
  return pageOf(rows.map(publicUser), query.limit, scope);
}

export async function updateProfile(id: string, input: ProfileInput, database: Database) {
  if (input.handle !== undefined)
    await execute('UPDATE users SET handle = ? WHERE id = ?', [input.handle, id], database);
  const fields: string[] = [];
  const values: SqlValue[] = [];
  for (const [column, value] of [
    ['display_name', input.name],
    ['bio', input.bio],
    ['location', input.location],
    ['website', input.website],
  ] as const) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (fields.length)
    await execute(
      `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`,
      [...values, id],
      database,
    );
}
