import { execute, select, type Database, type SqlValue } from '../../database/query.js';
import { decodeCursor, pageOf } from '../../shared/http/pagination.js';
import type {
  CreateProjectInput,
  ProjectsQuery,
  UpdateProjectInput,
} from './projects.validation.js';

export interface ProjectRecord {
  id: string;
  authorId: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'followers';
  createdAt: Date;
  updatedAt: Date;
}
const columns =
  'project.id, project.author_id AS authorId, project.title, project.description, project.status, project.visibility, project.created_at AS createdAt, project.updated_at AS updatedAt';
const access = `project.deleted_at IS NULL AND EXISTS(SELECT 1 FROM users u WHERE u.id = project.author_id AND u.status = 'active' AND u.deleted_at IS NULL)
  AND (project.author_id = ? OR (project.status = 'published' AND (project.visibility = 'public' OR EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id = ? AND f.followed_id = project.author_id))))`;

export async function findProject(
  id: string,
  viewerId: string | null,
  database?: Database,
  lock = false,
) {
  const rows = await select<ProjectRecord>(
    `SELECT ${columns} FROM projects project WHERE project.id = ? AND ${access}${lock ? ' FOR UPDATE' : ''}`,
    [id, viewerId, viewerId],
    database,
  );
  return rows[0] || null;
}
export async function listProjects(query: ProjectsQuery, viewerId: string | null) {
  const scope = `projects:${viewerId || ''}:${query.authorId || ''}:${query.q || ''}`;
  const cursor = decodeCursor(query.cursor, scope);
  const where = [access];
  const values: SqlValue[] = [viewerId, viewerId];
  if (query.authorId) {
    where.push('project.author_id = ?');
    values.push(query.authorId);
  }
  if (query.q) {
    where.push('(LOCATE(?, project.title) > 0 OR LOCATE(?, project.description) > 0)');
    values.push(query.q, query.q);
  }
  if (cursor) {
    where.push('(project.created_at < ? OR (project.created_at = ? AND project.id < ?))');
    values.push(cursor.date, cursor.date, cursor.id);
  }
  values.push(query.limit + 1);
  const rows = await select<ProjectRecord>(
    `SELECT ${columns} FROM projects project WHERE ${where.join(' AND ')} ORDER BY project.created_at DESC, project.id DESC LIMIT ?`,
    values,
  );
  return pageOf(rows, query.limit, scope);
}
export async function insertProject(
  id: string,
  userId: string,
  input: CreateProjectInput,
  database: Database,
) {
  await execute(
    'INSERT INTO projects (id, author_id, title, description, status, visibility) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, input.title, input.description, input.status, input.visibility],
    database,
  );
}
export async function updateProject(id: string, input: UpdateProjectInput, database: Database) {
  const fields: string[] = [];
  const values: SqlValue[] = [];
  for (const [column, value] of [
    ['title', input.title],
    ['description', input.description],
    ['status', input.status],
    ['visibility', input.visibility],
  ] as const) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }
  await execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, [...values, id], database);
}
export async function deleteProject(id: string, database: Database) {
  await execute('UPDATE projects SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?', [id], database);
}
