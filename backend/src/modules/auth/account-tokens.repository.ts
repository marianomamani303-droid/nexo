import { execute, select, type Database } from '../../database/query.js';

export interface AccountToken {
  userId: string;
  purpose: 'reset' | 'verify';
}
export async function insertToken(
  hash: string,
  userId: string,
  purpose: AccountToken['purpose'],
  expiresAt: Date,
) {
  await execute(
    'INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [hash, userId, purpose, expiresAt],
  );
}
export async function findToken(
  hash: string,
  purpose: AccountToken['purpose'],
  database?: Database,
  lock = false,
) {
  const rows = await select<AccountToken>(
    `SELECT user_id AS userId, purpose FROM account_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)${lock ? ' FOR UPDATE' : ''}`,
    [hash, purpose],
    database,
  );
  return rows[0] || null;
}
export async function consumeTokens(
  userId: string,
  purpose: AccountToken['purpose'],
  database: Database,
) {
  await execute(
    'UPDATE account_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND purpose = ? AND used_at IS NULL',
    [userId, purpose],
    database,
  );
}
export async function verifyEmail(userId: string, database: Database) {
  await execute(
    'UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP(3)) WHERE id = ?',
    [userId],
    database,
  );
}
