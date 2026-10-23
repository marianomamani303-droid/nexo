import { execute, select, type Database } from '../../database/query.js';
import type { SessionUser } from '../../shared/types.js';

export interface Credentials {
  id: string;
  passwordHash: string;
  status: 'active' | 'suspended' | 'deactivated';
  deletedAt: Date | null;
}

export async function findSessionUser(
  id: string,
  database?: Database,
): Promise<SessionUser | null> {
  const rows = await select<SessionUser>(
    `SELECT u.id, u.email, u.handle, p.display_name AS name
     FROM users u JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ? AND u.status = 'active' AND u.deleted_at IS NULL`,
    [id],
    database,
  );
  return rows[0] || null;
}

export async function findCredentials(email: string): Promise<Credentials | null> {
  const rows = await select<Credentials>(
    'SELECT id, password_hash AS passwordHash, status, deleted_at AS deletedAt FROM users WHERE email = ?',
    [email],
  );
  return rows[0] || null;
}

export async function lockCredentials(id: string, database: Database) {
  const rows = await select<Credentials>(
    'SELECT id, password_hash AS passwordHash, status, deleted_at AS deletedAt FROM users WHERE id = ? FOR UPDATE',
    [id],
    database,
  );
  return rows[0] || null;
}

export async function replacePasswordAndRevokeSessions(
  id: string,
  passwordHash: string,
  database: Database,
) {
  await updatePasswordHash(id, passwordHash, database);
  await execute('DELETE FROM auth_sessions WHERE user_id = ?', [id], database);
}

export async function updatePasswordHash(id: string, passwordHash: string, database: Database) {
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id], database);
}

export async function insertUser(user: SessionUser, passwordHash: string, database: Database) {
  await execute(
    'INSERT INTO users (id, email, handle, password_hash) VALUES (?, ?, ?, ?)',
    [user.id, user.email, user.handle, passwordHash],
    database,
  );
  await execute(
    'INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)',
    [user.id, user.name],
    database,
  );
}

export async function insertSession(
  id: string,
  userId: string,
  expiresAt: Date,
  database: Database,
) {
  await execute(
    'INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    [id, userId, expiresAt],
    database,
  );
}

export async function deleteSession(id: string, database?: Database) {
  await execute('DELETE FROM auth_sessions WHERE id = ?', [id], database);
}

export async function findSession(id: string, userId: string): Promise<SessionUser | null> {
  const rows = await select<SessionUser>(
    `SELECT u.id, u.email, u.handle, p.display_name AS name
     FROM auth_sessions s JOIN users u ON u.id = s.user_id JOIN user_profiles p ON p.user_id = u.id
     WHERE s.id = ? AND s.user_id = ? AND s.expires_at > UTC_TIMESTAMP(3)
       AND u.status = 'active' AND u.deleted_at IS NULL`,
    [id, userId],
  );
  return rows[0] || null;
}
