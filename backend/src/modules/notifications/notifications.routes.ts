import { Router } from 'express';
import { z } from 'zod';
import { authenticated, requireSession } from '../../middleware/require-session.js';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idParamsSchema } from '../../shared/validation.js';
import * as service from './notifications.service.js';

const querySchema = paginationSchema.extend({
  unread: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export function notificationsRoutes() {
  const router = Router();
  router.use(requireSession);
  router.get('/', async (request, response) => {
    response.json(
      await service.listNotifications(
        authenticated(request).user.id,
        querySchema.parse(request.query),
      ),
    );
  });
  router.put('/read', async (request, response) => {
    await service.markAllRead(authenticated(request).user.id);
    response.sendStatus(204);
  });
  router.put('/:id/read', async (request, response) => {
    await service.markRead(idParamsSchema.parse(request.params).id, authenticated(request).user.id);
    response.sendStatus(204);
  });
  return router;
}
