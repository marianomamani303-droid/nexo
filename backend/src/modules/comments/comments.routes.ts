import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import * as controller from './comments.controller.js';

export function commentsRoutes() {
  const router = Router();
  router.patch('/:id', requireSession, controller.update);
  router.delete('/:id', requireSession, controller.remove);
  router.put('/:id/reaction', requireSession, controller.react());
  router.delete('/:id/reaction', requireSession, controller.react(true));
  return router;
}
