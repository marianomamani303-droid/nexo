import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import * as controller from './projects.controller.js';

export function projectsRoutes() {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', requireSession, controller.create);
  router.patch('/:id', requireSession, controller.update);
  router.delete('/:id', requireSession, controller.remove);
  return router;
}
