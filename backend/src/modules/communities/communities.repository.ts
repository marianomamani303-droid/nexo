import {
  execute,
  select,
  type Database,
  type SqlValue,
  type SqlCount,
} from '../../database/query.js';
import { decodeCursor, pageOf, type PageQuery } from '../../shared/http/pagination.js';
import type {
  CommunityQuery,
  CommunityRole,
  CreateCommunityInput,
  UpdateCommunityInput,
} from './communities.validation.js';

export interface CommunityRecord {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}
interface CommunityRow extends CommunityRecord {
  memberRole: CommunityRole | null;
  membersCount: SqlCount;
}
const columns = `c.id, c.owner_id AS ownerId, c.slug, c.name, c.description, c.category, c.visibility, c.created_at AS createdAt, c.updated_at AS updatedAt`;
const publicColumns = `${columns}, (SELECT role FROM community_members m WHERE m.community_id = c.id AND m.user_id = ?) AS memberRole,
  (SELECT COUNT(*) FROM community_members m JOIN users member ON member.id = m.user_id WHERE m.community_id = c.id AND member.status = 'active' AND member.deleted_at IS NULL) AS membersCount`;
const access = `(c.visibility = 'public' OR EXISTS(SELECT 1 FROM community_members m WHERE m.community_id = c.id AND m.user_id = ?))`;

export async function findCommunity(id: string, viewerId: string | null) {
  const rows = await select<CommunityRow>(
    `SELECT ${publicColumns} FROM communities c WHERE c.id = ? AND c.deleted_at IS NULL AND ${access}`,
    [viewerId, id, viewerId],
  );
  return rows[0] ? { ...rows[0], membersCount: Number(rows[0].membersCount) } : null;
}

export async function lockCommunity(id: string, database: Database) {
  const rows = await select<CommunityRecord>(
    `SELECT ${columns} FROM communities c WHERE c.id = ? AND c.deleted_at IS NULL FOR UPDATE`,
    [id],
    database,
  );
  return rows[0] || null;
}

export async function memberRole(communityId: string, userId: string, database: Database) {
  const rows = await select<{ role: CommunityRole }>(
    'SELECT role FROM community_members WHERE community_id = ? AND user_id = ?',
    [communityId, userId],
    database,
  );
  return rows[0]?.role || null;
}

export async function listCommunities(query: CommunityQuery, viewerId: string | null) {
  const scope = `communities:${viewerId || ''}:${query.q || ''}:${query.category || ''}`;
  const cursor = decodeCursor(query.cursor, scope);
  const where = ['c.deleted_at IS NULL', access];
  const values: SqlValue[] = [viewerId, viewerId];
  if (query.q) {
    where.push('(LOCATE(?, c.name) > 0 OR LOCATE(?, c.description) > 0)');
    values.push(query.q, query.q);
  }
  if (query.category) {
    where.push('c.category = ?');
    values.push(query.category);
  }
  if (cursor) {
    where.push('(c.created_at < ? OR (c.created_at = ? AND c.id < ?))');
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<CommunityRow>(
    `SELECT ${publicColumns} FROM communities c WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
    values,
  );
  return pageOf(
    rows.map((row) => ({ ...row, membersCount: Number(row.membersCount) })),
    query.limit,
    scope,
  );
}

export async function listMembers(id: string, viewerId: string | null, query: PageQuery) {
  const scope = `community-members:${id}:${viewerId || ''}`;
  const cursor = decodeCursor(query.cursor, scope);
  const values: SqlValue[] = [id, viewerId];
  let condition = '';
  if (cursor) {
    condition = 'AND (m.joined_at < ? OR (m.joined_at = ? AND m.user_id < ?))';
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<{
    id: string;
    name: string;
    handle: string;
    role: CommunityRole;
    createdAt: Date;
  }>(
    `SELECT m.user_id AS id, p.display_name AS name, u.handle, m.role, m.joined_at AS createdAt FROM community_members m JOIN communities c ON c.id = m.community_id JOIN users u ON u.id = m.user_id JOIN user_profiles p ON p.user_id = u.id WHERE m.community_id = ? AND ${access} AND c.deleted_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL ${condition} ORDER BY m.joined_at DESC, m.user_id DESC LIMIT ?`,
    values,
  );
  return pageOf(rows, query.limit, scope);
}

export async function insertCommunity(
  id: string,
  userId: string,
  input: CreateCommunityInput,
  database: Database,
) {
  await execute(
    'INSERT INTO communities (id, owner_id, slug, name, description, category, visibility) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      userId,
      input.slug,
      input.name,
      input.description,
      input.category || null,
      input.visibility,
    ],
    database,
  );
  await execute(
    "INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, 'owner')",
    [id, userId],
    database,
  );
}

export async function updateCommunity(id: string, input: UpdateCommunityInput, database: Database) {
  const fields: string[] = [];
  const values: SqlValue[] = [];
  for (const [column, value] of [
    ['name', input.name],
    ['description', input.description],
    ['category', input.category],
    ['visibility', input.visibility],
  ] as const) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }
  await execute(
    `UPDATE communities SET ${fields.join(', ')} WHERE id = ?`,
    [...values, id],
    database,
  );
}

export async function deleteCommunity(id: string, database: Database) {
  await execute(
    'UPDATE communities SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?',
    [id],
    database,
  );
}
export async function setMember(
  id: string,
  userId: string,
  role: CommunityRole,
  database: Database,
) {
  await execute(
    'INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
    [id, userId, role],
    database,
  );
}
export async function removeMember(id: string, userId: string, database: Database) {
  await execute(
    'DELETE FROM community_members WHERE community_id = ? AND user_id = ?',
    [id, userId],
    database,
  );
}
