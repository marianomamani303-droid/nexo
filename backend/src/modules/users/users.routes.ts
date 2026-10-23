import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import * as controller from './users.controller.js';

export function usersRoutes() {
  const router = Router();
  router.get('/', controller.list);
  router.get('/me', requireSession, controller.me);
  router.patch('/me', requireSession, controller.update);
  router.get('/:id', controller.get);
  router.get('/:id/followers', controller.listRelations('followers'));
  router.get('/:id/following', controller.listRelations('following'));
  router.put('/:id/follow', requireSession, controller.follow);
  router.delete('/:id/follow', requireSession, controller.unfollow);
  return router;
}
