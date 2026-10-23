import { once } from 'node:events';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { pool } from './config/database.js';
import { verifyApplicationSchema } from './database/schema-check.js';

async function start() {
  await pool.query('SELECT 1');
  await verifyApplicationSchema(pool);
  const server = createApp().listen(config.port, config.host);
  await once(server, 'listening');
  console.log(`API en http://${config.host}:${config.port}`);

  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 10000);
    deadline.unref();
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await pool.end();
    } finally {
      clearTimeout(deadline);
    }
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      void shutdown().catch(() => {
        console.error('No se pudo completar el cierre de la API.');
        process.exitCode = 1;
      });
    });
  }
}

try {
  await start();
} catch {
  console.error(
    'No se pudo iniciar la API. Revisá el puerto, MySQL, las variables de entorno y las migraciones.',
  );
  await pool.end();
  process.exitCode = 1;
}
