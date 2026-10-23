import { readFile } from 'node:fs/promises';
import mysql, { type Connection, type Pool, type RowDataPacket } from 'mysql2/promise';
import { databaseError } from './db-cli.js';

let connection: Connection | undefined;
let pool: Pool | undefined;
try {
  const database = await import('../src/config/database.js');
  pool = database.pool;
  const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  const schemaName = schema.match(/^CREATE DATABASE ([a-zA-Z][a-zA-Z0-9_]*)(?:\s|;)/m)?.[1];
  if (!schemaName || schemaName !== database.databaseOptions.database) {
    throw new Error('DB_NAME no coincide con la base declarada en schema.sql. No se ejecutó SQL.');
  }
  connection = await mysql.createConnection({
    ...database.databaseOptions,
    database: undefined,
    // Solo para el archivo local de esquema, nunca para consultas de aplicación.
    multipleStatements: true,
  });
  const [existing] = await connection.execute<RowDataPacket[]>(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [schemaName],
  );
  if (existing.length)
    throw new Error(
      'La base ya existe. Aplicación cancelada para no modificar tablas o datos existentes.',
    );
  const [server] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
  console.log(
    `Servidor detectado: ${String(server[0]?.version)}. Creando la base nueva ${schemaName}.`,
  );
  await connection.query(schema);
  console.log('schema.sql ejecutado. No se insertaron datos. Ejecutá npm run db:verify.');
} catch (error) {
  console.error(databaseError(error));
  console.error(
    'No se realiza limpieza destructiva. Si hubo un fallo DDL, revisar la base parcial antes de continuar.',
  );
  process.exitCode = 1;
} finally {
  await connection?.end();
  await pool?.end();
}
