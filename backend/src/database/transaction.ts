import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../config/database.js';

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      console.error(JSON.stringify({ event: 'rollback_failed' }));
    }
    throw error;
  } finally {
    connection.release();
  }
}
