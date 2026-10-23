import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { databaseError } from './db-cli.js';

let pool: Pool | undefined;
let connection: PoolConnection | undefined;
try {
  const database = await import('../src/config/database.js');
  pool = database.pool;
  connection = await pool.getConnection();
  const [rows] = await connection.query<RowDataPacket[]>({ sql: 'SELECT 1 AS ok', timeout: 5000 });
  if (rows[0]?.ok !== 1) throw new Error('SELECT 1 no devolvió el resultado esperado.');
  console.log(
    `Conexión exitosa a ${database.databaseOptions.host}:${database.databaseOptions.port}/${database.databaseOptions.database}. SELECT 1 = 1.`,
  );
} catch (error) {
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool?.end();
}
