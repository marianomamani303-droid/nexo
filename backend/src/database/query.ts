import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';

export type Database = Pick<PoolConnection, 'execute'>;
export type SqlValue = string | number | boolean | Date | Buffer | null;
export type SqlCount = number | string;

export async function select<T extends object>(
  sql: string,
  values: SqlValue[] = [],
  database: Database = pool,
): Promise<T[]> {
  const [rows] = await database.execute<(T & RowDataPacket)[]>(sql, values);
  return rows;
}

export async function execute(
  sql: string,
  values: SqlValue[] = [],
  database: Database = pool,
): Promise<ResultSetHeader> {
  const [result] = await database.execute<ResultSetHeader>(sql, values);
  return result;
}
