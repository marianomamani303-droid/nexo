import { readFile } from 'node:fs/promises';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { databaseError } from './db-cli.js';
import { verifyApplicationSchema } from '../src/database/schema-check.js';

function columns(value: string): string[] {
  return value.split(',').map((column) => column.trim().replaceAll('`', ''));
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
let pool: Pool | undefined;
let connection: PoolConnection | undefined;
try {
  const database = await import('../src/config/database.js');
  pool = database.pool;
  connection = await pool.getConnection();
  const schemaName = database.databaseOptions.database;
  assert(typeof schemaName === 'string', 'DB_NAME no está configurado.');
  const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  const definitions = [
    ...schema.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\) ENGINE=InnoDB[^;]*;/g),
  ];
  assert(definitions.length > 0, 'No se pudieron leer las definiciones de schema.sql.');
  const [tables] = await connection.execute<RowDataPacket[]>(
    "SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
    [schemaName],
  );
  const allowedTables = new Set([
    ...definitions.map((definition) => definition[1]),
    'auth_sessions',
    'account_tokens',
    'schema_migrations',
  ]);
  assert(
    tables.every((table) => allowedTables.has(String(table.TABLE_NAME))),
    'Hay tablas no declaradas en el esquema o las migraciones.',
  );
  assert(
    tables.some((table) => table.TABLE_NAME === 'auth_sessions'),
    'Falta aplicar la migración 0006.',
  );
  assert(
    tables.some((table) => table.TABLE_NAME === 'account_tokens'),
    'Falta aplicar la migración 0007.',
  );
  await verifyApplicationSchema(connection);
  const [indexes] = await connection.execute<RowDataPacket[]>(
    'SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX',
    [schemaName],
  );
  const [foreignKeys] = await connection.execute<RowDataPacket[]>(
    'SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, k.ORDINAL_POSITION, r.DELETE_RULE, r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION',
    [schemaName],
  );
  const [checks] = await connection.execute<RowDataPacket[]>(
    "SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND CONSTRAINT_TYPE = 'CHECK'",
    [schemaName],
  );
  const [settings] = await connection.query<RowDataPacket[]>(
    'SELECT VERSION() AS version, @@foreign_key_checks AS foreign_keys_enabled',
  );
  assert(
    Number(settings[0]?.foreign_keys_enabled) === 1,
    'La comprobación de claves foráneas está deshabilitada.',
  );
  if (String(settings[0]?.version).includes('MariaDB')) {
    const [flags] = await connection.query<RowDataPacket[]>(
      'SELECT @@check_constraint_checks AS checks_enabled',
    );
    assert(
      Number(flags[0]?.checks_enabled) === 1,
      'La comprobación de restricciones CHECK está deshabilitada.',
    );
  }

  let expectedForeignKeys = 0;
  let expectedChecks = 0;
  let expectedIndexes = 0;
  for (const [, name, body] of definitions) {
    const table = tables.find((row) => row.TABLE_NAME === name);
    assert(table?.ENGINE === 'InnoDB', `Motor incorrecto en ${name}.`);
    assert(table.TABLE_COLLATION === 'utf8mb4_unicode_ci', `Collation incorrecta en ${name}.`);
    const keys = [...body.matchAll(/^ {2}(PRIMARY KEY|UNIQUE KEY (\w+)|KEY (\w+)) \(([^)]+)\)/gm)];
    assert(
      keys.some((key) => key[1] === 'PRIMARY KEY'),
      `Falta PK declarada en ${name}.`,
    );
    for (const key of keys) {
      const indexName = key[1] === 'PRIMARY KEY' ? 'PRIMARY' : key[2] || key[3];
      const actual = indexes.filter(
        (row) => row.TABLE_NAME === name && row.INDEX_NAME === indexName,
      );
      assert(
        JSON.stringify(actual.map((row) => String(row.COLUMN_NAME))) ===
          JSON.stringify(columns(key[4])),
        `Índice incompleto: ${name}.${indexName}.`,
      );
      const unique = key[1].startsWith('PRIMARY') || key[1].startsWith('UNIQUE');
      assert(
        actual.every((row) => Number(row.NON_UNIQUE) === (unique ? 0 : 1)),
        `Unicidad incorrecta en ${name}.${indexName}.`,
      );
      expectedIndexes++;
    }
    const fks = [
      ...body.matchAll(
        /CONSTRAINT (\w+) FOREIGN KEY \(([^)]+)\) REFERENCES (\w+) \(([^)]+)\) ON DELETE (CASCADE|RESTRICT|SET NULL) ON UPDATE (CASCADE|RESTRICT|SET NULL)/g,
      ),
    ];
    for (const [
      ,
      constraint,
      childColumns,
      parentTable,
      parentColumns,
      deleteRule,
      updateRule,
    ] of fks) {
      const actual = foreignKeys.filter(
        (row) => row.TABLE_NAME === name && row.CONSTRAINT_NAME === constraint,
      );
      assert(
        JSON.stringify(actual.map((row) => String(row.COLUMN_NAME))) ===
          JSON.stringify(columns(childColumns)),
        `FK incompleta: ${constraint}.`,
      );
      assert(
        JSON.stringify(actual.map((row) => String(row.REFERENCED_COLUMN_NAME))) ===
          JSON.stringify(columns(parentColumns)),
        `Destino incorrecto: ${constraint}.`,
      );
      assert(
        actual.every(
          (row) =>
            row.REFERENCED_TABLE_NAME === parentTable &&
            row.DELETE_RULE === deleteRule &&
            row.UPDATE_RULE === updateRule,
        ),
        `Reglas incorrectas: ${constraint}.`,
      );
      expectedForeignKeys++;
    }
    for (const [, constraint] of body.matchAll(/CONSTRAINT (\w+) CHECK/g)) {
      assert(
        checks.some((row) => row.TABLE_NAME === name && row.CONSTRAINT_NAME === constraint),
        `Falta CHECK ${constraint}.`,
      );
      expectedChecks++;
    }
    // El nombre proviene del archivo SQL local, no de entradas del usuario.
    assert(/^\w+$/.test(name), 'Nombre de tabla inválido.');
    const [count] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM \`${name}\``,
    );
    console.log(`${name}: ${String(count[0]?.total)} filas`);
  }
  const actualForeignKeyCount = new Set(foreignKeys.map((row) => String(row.CONSTRAINT_NAME))).size;
  assert(
    actualForeignKeyCount === expectedForeignKeys + 2,
    'La cantidad de claves foráneas no coincide.',
  );
  assert(checks.length === expectedChecks, 'La cantidad de CHECK no coincide.');
  console.log(
    `Verificación exitosa: ${definitions.length} tablas base, auth_sessions y account_tokens; ${expectedIndexes} índices base, ${expectedForeignKeys + 2} claves foráneas y ${expectedChecks} CHECK. Solo se ejecutaron lecturas.`,
  );
} catch (error) {
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool?.end();
}
