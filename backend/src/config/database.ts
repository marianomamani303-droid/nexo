import './load-env.js';
import mysql, { type ConnectionOptions } from 'mysql2/promise';
import type { PoolConnection } from 'mysql2';

function required(name: string, allowEmpty = false): string {
  const value = process.env[name];
  if (value === undefined || (!allowEmpty && !value.trim())) {
    throw new Error(`Falta ${name}. Configurá backend/.env a partir de .env.example.`);
  }
  return value;
}

const portText = required('DB_PORT');
const port = Number(portText);
if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT debe ser un puerto entero entre 1 y 65535.');
}
const database = required('DB_NAME');
if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(database)) {
  throw new Error(
    'DB_NAME debe ser un identificador de base de datos válido de hasta 64 caracteres.',
  );
}

export const databaseOptions: ConnectionOptions = {
  host: required('DB_HOST'),
  port,
  user: required('DB_USER'),
  password: required('DB_PASSWORD', true),
  database,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z',
  connectTimeout: 5000,
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: false,
};

export const pool = mysql.createPool({
  ...databaseOptions,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// The driver timezone option controls parsing; SQL defaults also need a UTC session.
pool.pool.on('connection', (connection: PoolConnection) => {
  connection.query("SET time_zone = '+00:00'", (error) => {
    if (error) connection.destroy();
  });
});
