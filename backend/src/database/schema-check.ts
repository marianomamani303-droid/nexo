import { select, type Database } from './query.js';

async function createStatement(table: 'auth_sessions' | 'account_tokens', database: Database) {
  const rows = await select<{ 'Create Table': string }>(`SHOW CREATE TABLE ${table}`, [], database);
  return (rows[0]?.['Create Table'] || '')
    .replaceAll('`', '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function includesAll(statement: string, fragments: string[]) {
  return fragments.every((fragment) => statement.includes(fragment));
}

export async function verifyAuthSessionSchema(database: Database) {
  const statement = await createStatement('auth_sessions', database);
  if (
    !includesAll(statement, [
      'id char(36)',
      'user_id char(36)',
      'expires_at datetime(3) not null',
      'primary key (id)',
      'key ix_auth_expiry (expires_at)',
      'constraint fk_auth_user foreign key (user_id) references users (id) on delete cascade',
    ])
  ) {
    throw new Error('auth_sessions no coincide con la migración 0006.');
  }
}

export async function verifyAccountTokenSchema(database: Database) {
  const statement = await createStatement('account_tokens', database);
  if (
    !includesAll(statement, [
      'token_hash char(64)',
      'user_id char(36)',
      "purpose enum('reset','verify') not null",
      'expires_at datetime(3) not null',
      'used_at datetime(3) default null',
      'primary key (token_hash)',
      'key ix_account_tokens_user (user_id,purpose,used_at)',
      'key ix_account_tokens_expiry (expires_at)',
      'constraint fk_account_tokens_user foreign key (user_id) references users (id) on delete cascade',
    ])
  ) {
    throw new Error('account_tokens no coincide con la migración 0007.');
  }
}

export async function verifyApplicationSchema(database: Database) {
  await verifyAuthSessionSchema(database);
  await verifyAccountTokenSchema(database);
}
