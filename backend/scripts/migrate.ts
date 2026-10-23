import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import mysql, { type Connection } from 'mysql2/promise';
import { databaseOptions, pool } from '../src/config/database.js';
import { execute, select } from '../src/database/query.js';
import { verifyAuthSessionSchema } from '../src/database/schema-check.js';

const directory = new URL('../database/migrations/', import.meta.url);
const apply = process.argv.includes('--apply');
const baselineExisting = process.argv.includes('--baseline-existing');
let connection: Connection | undefined;
let locked = false;
const lockName = `nexo:migrations:${String(databaseOptions.database)}`.slice(0, 64);

try {
  const files = (await readdir(directory))
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/.test(file))
    .sort();
  const migrations = await Promise.all(
    files.map(async (name) => {
      const sql = await readFile(new URL(name, directory), 'utf8');
      return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    }),
  );
  const versions = migrations.map((migration) => migration.name.slice(0, 4));
  if (new Set(versions).size !== versions.length)
    throw new Error('Hay versiones de migración duplicadas.');
  if (
    apply &&
    (!process.env.MIGRATION_DB_USER || process.env.MIGRATION_DB_PASSWORD === undefined)
  ) {
    throw new Error(
      'Para aplicar, definir MIGRATION_DB_USER y MIGRATION_DB_PASSWORD con credenciales administrativas locales.',
    );
  }
  connection = await mysql.createConnection({
    ...databaseOptions,
    user: apply ? process.env.MIGRATION_DB_USER : databaseOptions.user,
    password: apply ? process.env.MIGRATION_DB_PASSWORD : databaseOptions.password,
    multipleStatements: true,
  });
  const [lock] = await select<{ acquired: number }>(
    'SELECT GET_LOCK(?, 0) AS acquired',
    [lockName],
    connection,
  );
  if (lock.acquired !== 1) throw new Error('Otra ejecución de migraciones está activa.');
  locked = true;
  const tables = await select<{ name: string }>(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    [],
    connection,
  );
  const ledgerExists = tables.some((table) => table.name === 'schema_migrations');
  if (apply && !ledgerExists) {
    await execute(
      `CREATE TABLE schema_migrations (
      name VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      state ENUM('running', 'applied') NOT NULL,
      applied_at DATETIME(3) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      [],
      connection,
    );
  }
  const records =
    ledgerExists || apply
      ? await select<{ name: string; checksum: string; state: string }>(
          'SELECT name, checksum, state FROM schema_migrations',
          [],
          connection,
        )
      : [];
  for (const record of records) {
    const migration = migrations.find((item) => item.name === record.name);
    if (!migration || record.checksum !== migration.checksum)
      throw new Error(`Integridad inválida: ${record.name}. No editar migraciones aplicadas.`);
    if (record.state !== 'applied')
      throw new Error(
        `Migración incompleta: ${record.name}. Revisar el DDL parcial manualmente antes de continuar.`,
      );
  }
  for (const migration of migrations) {
    if (records.some((record) => record.name === migration.name)) {
      console.log(`${migration.name}: aplicada`);
      continue;
    }
    const existingAuth =
      migration.name === '0006_auth_sessions.sql' &&
      tables.some((table) => table.name === 'auth_sessions');
    console.log(
      `${migration.name}: ${existingAuth ? 'existente sin registro (requiere --baseline-existing)' : 'pendiente'}`,
    );
    if (!apply) continue;
    if (existingAuth) {
      if (!baselineExisting)
        throw new Error(
          'auth_sessions ya existe. Verificar y adoptar con --baseline-existing; no se sobrescribe.',
        );
      await verifyAuthSessionSchema(connection);
    }
    await execute(
      "INSERT INTO schema_migrations (name, checksum, state) VALUES (?, ?, 'running')",
      [migration.name, migration.checksum],
      connection,
    );
    // MySQL DDL commits implicitly. A failed migration remains running for explicit manual recovery.
    if (!existingAuth) await connection.query(migration.sql);
    await execute(
      "UPDATE schema_migrations SET state = 'applied', applied_at = UTC_TIMESTAMP(3) WHERE name = ?",
      [migration.name],
      connection,
    );
  }
  if (!apply) console.log('Plan de solo lectura. No se aplicaron migraciones.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudieron revisar las migraciones.');
  process.exitCode = 1;
} finally {
  if (connection && locked) {
    try {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch {
      // A lost connection releases its advisory locks automatically.
    }
  }
  try {
    await connection?.end();
  } catch {
    // Preserve the original migration error when the connection is already closed.
  }
  await pool.end();
}
