import { Router } from 'express';
import { select } from '../../database/query.js';
import { AppError } from '../../shared/errors/app-error.js';

export function healthRoutes() {
  const router = Router();
  router.get('/', (_request, response) => {
    response.json({ status: 'ok' });
  });
  router.get('/ready', async (_request, response) => {
    try {
      await select('SELECT 1');
    } catch {
      throw new AppError(
        503,
        'DATABASE_UNAVAILABLE',
        'El servicio no está disponible temporalmente.',
      );
    }
    response.json({ status: 'ready' });
  });
  return router;
}
